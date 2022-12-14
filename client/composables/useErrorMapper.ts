export default (errorData: string) => {
  const parsedErrors = JSON.parse(errorData)
  return new Map<string, { message: InputValidation; }>(Object.entries(parsedErrors))
}
