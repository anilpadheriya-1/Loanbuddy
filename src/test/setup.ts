import '@testing-library/jest-dom/vitest'

// jsdom gaps used by Radix / layout code.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver)
window.scrollTo = (() => {}) as typeof window.scrollTo
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? function () {}
Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false)
