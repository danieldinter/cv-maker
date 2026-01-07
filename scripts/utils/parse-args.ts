function parseArg(name: string): string | null {
  const argv = process.argv.slice(2);
  const fileArg = argv.find((a) => a.startsWith(`--${name}=`));
  return fileArg ? fileArg.split("=")[1] : null;
}

export { parseArg };
