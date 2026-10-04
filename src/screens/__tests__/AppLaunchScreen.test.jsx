import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AccessibilityInfo, Animated } from 'react-native';
import { AppLaunchScreen } from '../AppLaunchScreen';

jest.mock('../../context/LanguageContext', () => ({ useLanguage: () => ({ language: 'fr' }) }));
jest.mock('lucide-react-native', () => ({ GraduationCap: () => null }));

let renderer;
beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  jest.spyOn(Animated, 'timing').mockImplementation((_value, config) => {
    let timer;
    return {
      start: callback => { timer = setTimeout(() => callback?.({ finished: true }), (config.duration ?? 0) + (config.delay ?? 0)); },
      stop: () => clearTimeout(timer),
      reset: jest.fn(),
    };
  });
});
afterEach(() => { act(() => renderer?.unmount()); jest.restoreAllMocks(); jest.useRealTimers(); });

it('signals animation completion once and waits for app readiness before exiting', async () => {
  const finish = jest.fn();
  const exit = jest.fn();
  await act(async () => { renderer = TestRenderer.create(<AppLaunchScreen onFinish={finish} onExit={exit} />); });
  act(() => jest.advanceTimersByTime(1100));
  expect(finish).toHaveBeenCalledTimes(1);
  expect(exit).not.toHaveBeenCalled();
  act(() => renderer.update(<AppLaunchScreen onFinish={() => finish()} onExit={exit} isReady />));
  act(() => jest.advanceTimersByTime(220));
  expect(exit).toHaveBeenCalledTimes(1);
  expect(finish).toHaveBeenCalledTimes(1);
});

it('skips animated waiting when reduced motion is enabled', async () => {
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
  const finish = jest.fn();
  const exit = jest.fn();
  await act(async () => { renderer = TestRenderer.create(<AppLaunchScreen onFinish={finish} onExit={exit} isReady />); });
  act(() => jest.advanceTimersByTime(1));
  expect(finish).toHaveBeenCalledTimes(1);
  expect(exit).toHaveBeenCalledTimes(1);
});

it('cancels completion when the launch screen unmounts early', async () => {
  const finish = jest.fn();
  await act(async () => { renderer = TestRenderer.create(<AppLaunchScreen onFinish={finish} />); });
  act(() => renderer.unmount());
  act(() => jest.advanceTimersByTime(2000));
  expect(finish).not.toHaveBeenCalled();
});
