export function isErrorStructure(definitionName: string) {
  return definitionName == 'HiveSystemError' ||
    definitionName == 'HiveMPSystemError' ||
    definitionName == 'HiveSystemErrorData' ||
    definitionName == 'HiveMPSystemErrorData' ||
    definitionName == 'HiveMPSystemQueryError';
}