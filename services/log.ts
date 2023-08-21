
export function Log(identifier: string, obj: any) {
  const content = typeof obj !== 'string' ? JSON.stringify(obj, null, 2) : obj;
  console.log(`${new Date().toISOString()} => ${identifier} => ` + content)
}