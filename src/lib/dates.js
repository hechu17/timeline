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

function dateFor(record, prefix, calendarMode = 'gregorian', eras = []) {
  if (!record) return null
  if (calendarMode === 'custom') {
    const eraId = record[`${prefix}_era_id`]
    const rawYear = record[`${prefix}_year`]
    const hasYear = rawYear !== null && rawYear !== undefined && rawYear !== ''
    const localYear = hasYear ? Number(rawYear) : 0
    const eraIndex = eras.findIndex(era => era.id === eraId)
    const era = eraIndex >= 0 ? eras[eraIndex] : null
    if (!era || (hasYear && (!Number.isInteger(localYear) || localYear < 1))) return null
    const startYear = Number(era.start_year) || 1
    return {
      year: hasYear ? startYear + localYear - 1 : startYear - 1,
      localYear,
      hasYear,
      month: Number(record[`${prefix}_month`]) || 0,
      day: Number(record[`${prefix}_day`]) || 0,
      eraName: era.name,
      eraIndex,
    }
  }

  const value = record[`${prefix}_date`]
  if (!value) return null
  const match = /^(\d{1,6})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]), eraName: '', eraIndex: 0 }
}

export function hasStoryDate(record, prefix, calendarMode = 'gregorian', eras = []) {
  return Boolean(dateFor(record, prefix, calendarMode, eras))
}

export function compareStoryDates(first, firstPrefix, second, secondPrefix, calendarMode = 'gregorian', eras = []) {
  const a = dateFor(first, firstPrefix, calendarMode, eras)
  const b = dateFor(second, secondPrefix, calendarMode, eras)
  if (!a || !b) return null
  const keys = calendarMode === 'custom'
    ? ['eraIndex', 'localYear', 'month', 'day']
    : ['year', 'month', 'day']
  for (const key of keys) {
    if (a[key] !== b[key]) return a[key] < b[key] ? -1 : 1
  }
  return 0
}

export function ageAtStoryDate(character, event, calendarMode = 'gregorian', eras = []) {
  const birth = dateFor(character, 'birth', calendarMode, eras)
  const moment = dateFor(event, 'event', calendarMode, eras)
  if (!birth || !moment) return null
  if (calendarMode === 'custom' && (!birth.hasYear || !moment.hasYear)) return null
  if (moment.year < birth.year || (moment.year === birth.year && birth.month > 0 && moment.month > 0
    && (moment.month < birth.month || (moment.month === birth.month && birth.day > 0 && moment.day > 0 && moment.day < birth.day)))) return '出生前'

  let years = moment.year - birth.year
  const hasMonthAndDay = birth.month > 0 && birth.day > 0 && moment.month > 0 && moment.day > 0
  const beforeBirthday = hasMonthAndDay && (moment.month < birth.month
    || (moment.month === birth.month && moment.day < birth.day))
  if (beforeBirthday) years -= 1
  const approximate = !hasMonthAndDay
  return `${approximate ? '约' : ''}${years} 岁`
}

export function isAfterStoryDate(first, firstPrefix, second, secondPrefix, calendarMode = 'gregorian', eras = []) {
  return compareStoryDates(first, firstPrefix, second, secondPrefix, calendarMode, eras) > 0
}

export function formatStoryDate(record, prefix, calendarMode = 'gregorian', eras = []) {
  const date = dateFor(record, prefix, calendarMode, eras)
  if (!date) {
    const oldDate = record?.[`${prefix}_date`]
    return calendarMode === 'custom' && oldDate ? `公历 · ${displayDate(oldDate)}` : ''
  }
  if (calendarMode !== 'custom') return displayDate(record[`${prefix}_date`])
  const month = date.month ? `${date.month}月` : ''
  const day = date.day ? `${date.day}日` : ''
  const year = date.hasYear ? `第${date.localYear}年` : ''
  return `${date.eraName}${year}${month}${day}`
}

export function displayDate(value) {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  return `${year}年${Number(month)}月${Number(day)}日`
}
