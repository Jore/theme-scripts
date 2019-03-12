export function mergeObjects(...args: {}[]) {
  var to = Object({});

  for (var index = 0; index < args.length; index++) {
    var nextSource = args[index];

    if (nextSource) {
      for (var nextKey in nextSource) {
        if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
          to[nextKey] = nextSource[nextKey];
        }
      }
    }
  }
  return to;
}
