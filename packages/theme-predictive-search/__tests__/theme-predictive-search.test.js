import "isomorphic-fetch";
import fetchMock from "fetch-mock";
import PredictiveSearch from "../src/theme-predictive-search";
import searchAsYouTypeTheCallingFixture from "../__fixtures__/search_as_you_type_the_calling.json";
import searchAsYouTypeTheFollowingFixture from "../__fixtures__/search_as_you_type_the_following.json";

/* eslint-disable camelcase */
const defaultConfig = {
  search_as_you_type: {
    fuzzy: true,
    types: [PredictiveSearch.TYPES.PRODUCT]
  }
};

describe("Search()", () => {
  it("should be able to create an instance", () => {
    const search = new PredictiveSearch(defaultConfig);
    expect(search).toBeInstanceOf(PredictiveSearch);
  });

  describe("throws", () => {
    it("when config object is not set", () => {
      let search;
      expect(() => {
        search = new PredictiveSearch();
      }).toThrow(new TypeError("No config object was specified"));
      expect(search).toBeUndefined();
    });
  });

  describe("query()", () => {
    describe("throws", () => {
      it("when the query is not present", done => {
        const search = new PredictiveSearch(defaultConfig);

        search.on("error", error => {
          expect(error.type).toBe("argument");
          expect(error.message).toBe("'query' is missing");
          done();
        });

        search.query();
      });

      it("when the query is not a string", done => {
        const search = new PredictiveSearch(defaultConfig);

        search.on("error", error => {
          expect(error.type).toBe("argument");
          expect(error.message).toBe("'query' is not a string");
          done();
        });

        search.query(1);
      });
    });

    describe("debounce", () => {
      beforeAll(() => {
        jest.useFakeTimers();
      });

      beforeEach(() => {
        fetchMock.mock(
          "begin:/search/suggest.json",
          searchAsYouTypeTheCallingFixture
        );
      });

      afterEach(() => {
        fetchMock.restore();
      });

      afterAll(() => {
        jest.useRealTimers();
      });

      it("does not make a request before the debounce rate", () => {
        const search = new PredictiveSearch(defaultConfig);

        search.query("The Caling");

        expect(fetchMock.calls().length).toBe(0);

        jest.advanceTimersByTime(search.DEBOUNCE_RATE);

        expect(fetchMock.calls().length).toBe(1);
      });

      it("only make one request on multiple calls to query()", () => {
        const search = new PredictiveSearch(defaultConfig);

        search.query("The Caling");
        search.query("The Caling");
        search.query("The Caling");

        expect(fetchMock.calls().length).toBe(0);

        jest.advanceTimersByTime(search.DEBOUNCE_RATE);

        expect(fetchMock.calls().length).toBe(1);
      });
    });

    describe("200", () => {
      beforeEach(() => {
        jest.useFakeTimers();
        fetchMock.mock(
          "begin:/search/suggest.json",
          searchAsYouTypeTheCallingFixture
        );
      });

      afterEach(() => {
        fetchMock.restore();
        jest.useRealTimers();
      });

      it("does not make a request when query is empty", done => {
        const spy = jest.fn();
        const search = new PredictiveSearch(defaultConfig);

        search.on("success", spy);

        search.query("");

        jest.advanceTimersByTime(search.DEBOUNCE_RATE);
        jest.useRealTimers();

        setTimeout(() => {
          expect(spy).not.toBeCalled();
          done();
        }, 0);
      });

      it("result has the expected shape", done => {
        const search = new PredictiveSearch(defaultConfig);

        search.on("success", result => {
          expect(result).toMatchObject({
            search_as_you_type: {
              results: {
                products: [
                  {
                    title: "The Calling",
                    body: "<p>The Calling</p>",
                    handle: "calling",
                    image: "https://cdn.shopify.com/...",
                    url: "/products/calling?variant_id=1",
                    price: "3099.00",
                    variants: [
                      {
                        title: "Large / Angry Dolphin",
                        url: "https://www.evil-bikes.com/products/calling",
                        image: "https://cdn.shopify.com/...",
                        price: "3099.00",
                        compare_at_price: "4099.00"
                      }
                    ]
                  }
                ]
              }
            }
          });

          expect(fetchMock.calls().length).toBe(1);

          done();
        });

        search.query("The Caling");

        jest.advanceTimersByTime(search.DEBOUNCE_RATE);
      });

      it("gets a previous request response from local cache", done => {
        const search = new PredictiveSearch(defaultConfig);

        search.query("foo");
        jest.advanceTimersByTime(search.DEBOUNCE_RATE);

        search.query("bar");
        jest.advanceTimersByTime(search.DEBOUNCE_RATE);

        jest.useRealTimers();

        setTimeout(() => {
          search.query("foo");
          expect(fetchMock.calls().length).toBe(2);
          search.query("bar");
          expect(fetchMock.calls().length).toBe(2);
          done();
        }, 0);
      });
    });

    describe("200 gets the latest result", () => {
      beforeEach(() => {
        jest.useFakeTimers();
        fetchMock.mock(
          "begin:/search/suggest.json?query=The%20Calling",
          new Promise(resolve => {
            setTimeout(() => resolve(searchAsYouTypeTheCallingFixture), 5000);
          })
        );
        fetchMock.mock(
          "begin:/search/suggest.json?query=The%20Following",
          searchAsYouTypeTheFollowingFixture
        );
      });

      afterEach(() => {
        fetchMock.restore();
        jest.useRealTimers();
      });

      it("when first request resolves after the last request", done => {
        const successCallback = jest.fn();
        const search = new PredictiveSearch(defaultConfig);

        search.on("success", successCallback);

        search.query("The Calling");
        jest.advanceTimersByTime(search.DEBOUNCE_RATE);

        search.query("The Following");
        jest.advanceTimersByTime(search.DEBOUNCE_RATE);

        expect(fetchMock.calls().length).toBe(2);

        jest.runAllTimers();
        jest.useRealTimers();

        setTimeout(() => {
          expect(successCallback).toBeCalledTimes(1);
          expect(successCallback).toBeCalledWith(
            searchAsYouTypeTheFollowingFixture
          );
          done();
        }, 0);
      });
    });

    describe("429 Too Many Requests", () => {
      beforeEach(() => {
        fetchMock.mock("begin:/search/suggest.json", {
          status: 429,
          headers: new Headers({
            "Content-Type": "text/html",
            "Retry-After": 1000
          })
        });
      });

      afterEach(() => {
        fetchMock.restore();
      });

      it("gets the rate limit header and set it to the error object and the predictiveSearch instance", done => {
        const search = new PredictiveSearch(defaultConfig);

        search.on("error", error => {
          expect(error.name).toBe("Throttled");
          expect(error.message).toBe("Too Many Requests");
          expect(error.retryAfter).toBe(1000);
          expect(search._retryAfter).toBe(1000);
          done();
        });

        search.query("The Caling");
      });
    });
  });
});
