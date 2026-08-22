import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import xlsx from 'xlsx'
import { generateSku } from '../src/lib/sku.js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Faltan variables de entorno. Asegúrate de tener VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env'
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

const filePath = process.argv[2]
const shouldReset = process.argv.includes('--reset')

if (!filePath || filePath.startsWith('--')) {
  console.error('Uso: node scripts/import-excel.js <ruta-al-excel> [--reset]')
  process.exit(1)
}

async function getOrCreateCategories(sheetNames) {
  const { data: existing, error: fetchError } = await supabase
    .from('categories')
    .select('*')

  if (fetchError) throw fetchError

  const byName = {}
  for (const cat of existing || []) {
    byName[cat.name.trim().toUpperCase()] = cat
  }

  for (const name of sheetNames) {
    const key = name.trim().toUpperCase()
    if (!byName[key]) {
      const { data, error } = await supabase
        .from('categories')
        .insert({ name: name.trim() })
        .select()
        .single()

      if (error) throw error
      byName[key] = data
      console.log(`Categoría creada: ${data.name}`)
    }
  }

  return byName
}

function parseNumber(value) {
  if (value === undefined || value === null || value === '') return 0
  const n = parseFloat(value)
  return isNaN(n) ? 0 : n
}

function findHeaderRow(rows) {
  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].map((c) => String(c || '').toUpperCase().trim())
    if (cells.includes('PRODUCTO')) return i
  }
  return -1
}

function findColumnIndex(header, possibleNames) {
  for (const name of possibleNames) {
    const idx = header.findIndex((h) => h.includes(name))
    if (idx !== -1) return idx
  }
  return -1
}

async function importSheet(sheetName, rows, categoriesByName, existingProducts) {
  const category = categoriesByName[sheetName.trim().toUpperCase()]
  if (!category) {
    console.warn(`Categoría no encontrada para hoja: ${sheetName}`)
    return
  }

  const headerRowIndex = findHeaderRow(rows)
  if (headerRowIndex === -1) {
    console.warn(`No se encontró fila de encabezado en ${sheetName}`)
    return
  }

  const header = rows[headerRowIndex].map((c) => String(c || '').toUpperCase().trim())

  const idxProducto = findColumnIndex(header, ['PRODUCTO'])
  const idxCantidad = findColumnIndex(header, ['CANTIDAD'])
  const idxCosto = findColumnIndex(header, ['COSTO', 'COSTO UNITARIO'])
  const idxTax = findColumnIndex(header, ['TAX'])
  const idxEnvio = findColumnIndex(header, ['COSTO ENVIO', 'COSTO DE ENVIO'])
  const idxPrecioVenta = findColumnIndex(header, ['PRECIO VENTA'])
  const idxTalla = findColumnIndex(header, ['TALLA'])

  if (idxProducto === -1) {
    console.warn(`No se encontró columna PRODUCTO en ${sheetName}`)
    return
  }

  let subgroup = ''
  let imported = 0
  let skipped = 0

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i]
    const rawProducto = row[idxProducto]

    if (
      rawProducto === undefined ||
      rawProducto === null ||
      String(rawProducto).trim() === ''
    ) {
      continue
    }

    const cantidad = parseNumber(row[idxCantidad])
    const costo = parseNumber(row[idxCosto])

    // Filas de subgrupo: tienen nombre pero no cantidad ni costo
    if (cantidad === 0 && costo === 0) {
      subgroup = String(rawProducto).trim()
      continue
    }

    let name = String(rawProducto).trim()
    if (
      subgroup &&
      !name.toUpperCase().startsWith(subgroup.toUpperCase())
    ) {
      name = `${subgroup} - ${name}`
    }

    if (idxTalla !== -1 && row[idxTalla]) {
      name = `${name} - Talla ${String(row[idxTalla]).trim()}`
    }

    const tax = parseNumber(row[idxTax])
    const envio = parseNumber(row[idxEnvio])
    const precioVenta = parseNumber(row[idxPrecioVenta])

    // Calcular margen de ganancia real para que el trigger de Supabase
    // reproduzca exactamente el PRECIO VENTA del Excel.
    let profitMargin = 50
    if (costo > 0) {
      profitMargin = ((precioVenta - costo - tax - envio) / costo) * 100
      if (profitMargin < 0) profitMargin = 0
    }

    const sku = generateSku(category.name, name, existingProducts)

    if (existingProducts.some((p) => p.sku === sku)) {
      console.log(`⚠ Ya existe ${sku}, se omite`)
      skipped++
      continue
    }

    const product = {
      id: sku,
      name,
      category_id: category.id,
      barcode: null,
      sku,
      cost: costo,
      tax,
      shipping_cost: envio,
      profit_margin: parseFloat(profitMargin.toFixed(2)),
      sale_price: precioVenta,
      stock: cantidad,
      active: true,
    }

    const { error } = await supabase.from('products').insert(product)

    if (error) {
      console.error(`Error insertando "${name}":`, error.message)
      skipped++
    } else {
      console.log(`✓ ${sku} - ${name}`)
      existingProducts.push({ id: product.id, sku, name })
      imported++
    }
  }

  console.log(
    `Hoja ${sheetName}: ${imported} importados, ${skipped} errores`
  )
}

async function main() {
  if (shouldReset) {
    console.log('Borrando productos existentes...')
    const { error } = await supabase
      .from('products')
      .delete()
      .not('id', 'is', null)
    if (error) throw error
    console.log('Productos borrados.')
  }

  const workbook = xlsx.readFile(filePath)
  const categoriesByName = await getOrCreateCategories(workbook.SheetNames)

  const { data: existingProducts, error: productsError } = await supabase
    .from('products')
    .select('id, sku, name')

  if (productsError) throw productsError

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName]
    const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
    console.log(`\n=== Importando hoja: ${sheetName} (${rows.length} filas) ===`)
    await importSheet(sheetName, rows, categoriesByName, existingProducts || [])
  }

  console.log('\nImportación finalizada.')
}

main().catch((err) => {
  console.error('Error durante la importación:', err)
  process.exit(1)
})
