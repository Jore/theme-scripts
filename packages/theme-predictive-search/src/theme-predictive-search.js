import { validateConfig, validateQuery } from "./validate";
import request, { parseResponseStatus, parseResponse } from "./request";
import { debounce, objectToQueryParams, Dispatcher, Cache } from "./utilities";

export default function PredictiveSearch(config) {
  try {
    validateConfig(config);
  } catch (error) {
    throw error;
  }

  this._retryAfter = null;
  this._currentQuery = null;

  this.dispatcher = new Dispatcher();
  this.cache = new Cache({ bucketSize: 40 });
  this.configParams = objectToQueryParams(config);
}

PredictiveSearch.TYPES = {
  PRODUCT: "product"
};

PredictiveSearch.prototype.DEBOUNCE_RATE = 10;

PredictiveSearch.prototype.query = function query(query) {
  var self = this;

  try {
    validateQuery(query);
  } catch (error) {
    this.dispatcher.dispatch("error", error);
    return;
  }

  if (query === "") {
    return self;
  }

  self._currentQuery = query;
  var cacheResult = self.cache.get(query);
  if (cacheResult) {
    self.dispatcher.dispatch("success", cacheResult);
    return self;
  }

  makeRequestDebounced(
    self.configParams,
    query,
    function(result) {
      self.cache.set(result.query, result);
      if (result.query === self._currentQuery) {
        self._retryAfter = null;
        self.dispatcher.dispatch("success", result);
      }
    },
    function(error) {
      if (error.retryAfter) {
        self._retryAfter = error.retryAfter;
      }
      self.dispatcher.dispatch("error", error);
    }
  );

  return self;
};

PredictiveSearch.prototype.on = function on(eventName, callback) {
  this.dispatcher.on(eventName, callback);

  return this;
};

PredictiveSearch.prototype.off = function on(eventName, callback) {
  this.dispatcher.off(eventName, callback);

  return this;
};

var makeRequestDebounced = debounce(function makeRequest(
  configParams,
  query,
  onSuccess,
  onError
) {
  var encodedQuery = encodeURIComponent(query);

  request("/search/suggest.json?query=" + encodedQuery + "&" + configParams)
    .then(parseResponseStatus)
    .then(parseResponse)
    .then(function(response) {
      response.query = query;
      return response;
    })
    .then(onSuccess)
    .catch(onError);
},
PredictiveSearch.prototype.DEBOUNCE_RATE);
