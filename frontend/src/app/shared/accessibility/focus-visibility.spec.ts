import { revealKeyboardFocus } from './focus-visibility';

describe('keyboard focus visibility', () => {
  let header: HTMLElement;
  let button: HTMLButtonElement;
  beforeEach(() => {
    header = document.createElement('app-top-navbar');
    header.style.position = 'sticky';
    button = document.createElement('button');
    button.textContent = 'Controle';
    document.body.append(header, button);
  });
  afterEach(() => {
    header.remove();
    button.remove();
  });
  it('reveals keyboard focus hidden by the sticky header without moving focus', () => {
    spyOn(window, 'requestAnimationFrame').and.callFake((callback) => {
      callback(0);
      return 0;
    });
    spyOn(header, 'getBoundingClientRect').and.returnValue({
      top: 0,
      bottom: 128,
      width: 100,
      height: 128,
    } as DOMRect);
    spyOn(button, 'getBoundingClientRect').and.returnValue({
      top: 80,
      bottom: 120,
      width: 100,
      height: 40,
    } as DOMRect);
    button.focus();
    spyOn(button, 'matches').and.returnValue(true);
    const scroll = spyOn(window, 'scrollBy');
    revealKeyboardFocus(button, document);
    expect(scroll).toHaveBeenCalled();
    expect(
      (scroll.calls.mostRecent().args as unknown as [ScrollToOptions])[0],
    ).toEqual({ top: -60, behavior: 'instant' });
    expect(document.activeElement).toBe(button);
  });
  it('does not scroll mouse focus', () => {
    const scroll = spyOn(window, 'scrollBy');
    spyOn(button, 'matches').and.returnValue(false);
    revealKeyboardFocus(button, document);
    expect(scroll).not.toHaveBeenCalled();
  });
});
