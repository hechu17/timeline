export function ageAt(birthDate, eventDate) {
  if (!birthDate || !eventDate) return null
  const birth = new Date(`${birthDate}T00:00:00Z`)
  const event = new Date(`${eventDate}T00:00:00Z`)
  if (Number.isNaN(birth.valueOf()) || Number.isNaN(event.valueOf())) return null
  if (event < birth) return '出生前'

  let years = event.getUTCFullYear() - birth.getUTCFullYear()
  const beforeBirthday = event.getUTCMonth() < birth.getUTCMonth()
    || (event.getUTCMonth() === birth.getUTCMonth() && event.getUTCDate() < birth.getUTCDate())
  if (beforeBirthday) years -= 1
  return `${years} 岁`
}

export function displayDate(value) {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  return `${year}年${Number(month)}月${Number(day)}日`
}
