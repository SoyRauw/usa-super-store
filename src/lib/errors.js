export function getErrorMessage(error) {
  if (!error) return 'Ocurrió un error inesperado. Intenta de nuevo.'

  const message = error.message || error.error_description || String(error)

  const known = {
    'Invalid login credentials': 'Correo o contraseña incorrectos.',
    'Email not confirmed': 'El correo aún no ha sido confirmado.',
    'User already registered': 'Este correo ya está registrado.',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
    'duplicate key value violates unique constraint': 'Ya existe un registro con ese valor único (SKU o barcode).',
    'violates foreign key constraint': 'No se puede eliminar porque tiene registros relacionados.',
    'JWT expired': 'Tu sesión expiró. Inicia sesión de nuevo.',
    'new row for relation': 'Error al guardar: verifica los datos ingresados.',
    'NetworkError': 'Error de conexión. Verifica tu internet.',
    'Failed to fetch': 'No se pudo conectar con el servidor.',
  }

  for (const [key, value] of Object.entries(known)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return value
    }
  }

  if (message.includes('23505')) {
    return 'Ya existe un registro con ese valor único (SKU o barcode).'
  }

  if (message.includes('23503')) {
    return 'No se puede eliminar porque tiene registros relacionados.'
  }

  return message || 'Ocurrió un error. Intenta de nuevo.'
}
