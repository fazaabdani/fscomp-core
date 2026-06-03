function base36DatePart(value: number) {
  return value.toString(36).toUpperCase();
}

export function compactBatchDateCode(date: Date) {
  return `${base36DatePart(date.getMonth() + 1)}${base36DatePart(date.getDate())}`;
}

export function unitNumberWithBatchDate(rawNomorUnit: string, batchDate: Date) {
  const cleanNumber = rawNomorUnit.trim();
  if (/-[0-9A-Z]{2,3}$/i.test(cleanNumber)) return cleanNumber.toUpperCase();
  if (/-\d{6}$/.test(cleanNumber)) return displayUnitNumber(cleanNumber);
  return `${cleanNumber}-${compactBatchDateCode(batchDate)}`;
}

export function displayUnitNumber(nomorUnit: string) {
  return nomorUnit.replace(/-(\d{2})(\d{2})\d{2}$/, (_, day: string, month: string) => {
    return `-${base36DatePart(Number(month))}${base36DatePart(Number(day))}`;
  });
}
