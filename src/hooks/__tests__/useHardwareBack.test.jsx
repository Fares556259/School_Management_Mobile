import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { BackHandler, Platform } from 'react-native';
import { useHardwareBack } from '../useHardwareBack';

function Screen({ onBack }) { useHardwareBack(onBack); return null; }
let renderer;
let platform;
beforeEach(() => { platform = Platform.OS; Platform.OS = 'android'; });
afterEach(() => { act(() => renderer?.unmount()); renderer = undefined; Platform.OS = platform; jest.restoreAllMocks(); });

it('consumes Android back and uses the current screen action after a step changes', () => {
  const listeners = [];
  const remove = jest.fn();
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((event, handler) => {
    expect(event).toBe('hardwareBackPress'); listeners.push(handler); return { remove };
  });
  const passwordBack = jest.fn();
  const phoneBack = jest.fn();
  act(() => { renderer = TestRenderer.create(<Screen onBack={passwordBack} />); });
  expect(listeners[0]()).toBe(true);
  expect(passwordBack).toHaveBeenCalledTimes(1);
  act(() => renderer.update(<Screen onBack={phoneBack} />));
  expect(remove).toHaveBeenCalledTimes(1);
  expect(listeners[1]()).toBe(true);
  expect(phoneBack).toHaveBeenCalledTimes(1);
  act(() => renderer.unmount()); renderer = undefined;
  expect(remove).toHaveBeenCalledTimes(2);
});

it('does not install an Android handler on iOS', () => {
  Platform.OS = 'ios';
  const subscribe = jest.spyOn(BackHandler, 'addEventListener');
  act(() => { renderer = TestRenderer.create(<Screen onBack={jest.fn()} />); });
  expect(subscribe).not.toHaveBeenCalled();
});
