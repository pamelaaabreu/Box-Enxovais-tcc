declare module 'bootstrap/js/src/carousel.js' {
  export default class Carousel {
    static getOrCreateInstance(
      element: Element,
      options: Record<string, unknown>,
    ): Carousel;
    pause(): void;
    cycle(): void;
    dispose(): void;
  }
}
