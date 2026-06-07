// Custom resolver: normalizes Windows backslash paths to forward slashes
// before passing to Jest's defaultResolver. Required because unrs-resolver
// (used by jest-resolve 30.x on Windows) mishandles backslash basedir paths,
// resolving "C:\dev\intramural" as "C:node_modules\..." instead of the correct path.
module.exports = (request, options) => {
  const normalizedOptions = {
    ...options,
    basedir: options.basedir ? options.basedir.replace(/\\/g, '/') : options.basedir,
  };
  return options.defaultResolver(request, normalizedOptions);
};
