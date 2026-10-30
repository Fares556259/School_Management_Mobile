import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity, Share } from 'react-native';
import { HniaRecordsCard, HniaEvidence } from '../components/HniaDataCard';
import { freshnessLabel, contextualPrompts } from '../hniaExperience';

let renderer;
const readText = () => renderer.root.findAllByType(Text).map(node => node.props.children).flat().join(' ');
const button = label => renderer.root.findAllByType(TouchableOpacity).find(node => node.findAllByType(Text).some(text => text.props.children === label));
const render = async element => { await act(async () => { renderer = TestRenderer.create(element); }); };
afterEach(() => { act(() => renderer?.unmount()); jest.restoreAllMocks(); });

it('starts with three students and expands without fetching or executing an action', async () => {
  const data = { kind: 'get_students', title: 'Classe 1A', className: '1A', total: 8, rows: Array.from({ length: 8 }, (_, index) => ({ key: String(index), title: `Student ${index}`, subtitle: '1A' })) };
  const open = jest.fn();
  await render(<HniaRecordsCard data={data} language="en" onOpenClass={open} />);
  expect(readText()).toContain('Student 2'); expect(readText()).not.toContain('Student 3'); expect(open).not.toHaveBeenCalled();
  act(() => button('Show remaining 5').props.onPress()); expect(readText()).toContain('Student 7');
  act(() => button('Open class').props.onPress()); expect(open).toHaveBeenCalledTimes(1);
  jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
  await act(async () => { await button('Export displayed list').props.onPress(); });
  expect(Share.share).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('8/8 loaded') }));
});
it('refreshes the exact read id and labels old results with their real age', async () => {
  const refresh = jest.fn();
  await render(<HniaEvidence language="en" schoolName="Leaders" onRefresh={refresh} evidence={{ source: 'school_database', fetchedAt: new Date(Date.now() - 600_000).toISOString(), total: 0, toolCallId: 'read-a', filters: { className: '1A' } }} />);
  expect(readText()).toContain('10 min ago'); expect(readText()).toContain('0 records'); expect(readText()).toContain('Class: 1A');
  act(() => button('Refresh').props.onPress()); expect(refresh).toHaveBeenCalledWith('read-a');
});
it('never labels missing timestamps as just now and changes prompts with time and previous class', () => {
  expect(freshnessLabel(undefined, 'en')).toBe('Time unavailable');
  expect(contextualPrompts('en', 8)[0].id).toBe('attendance');
  expect(contextualPrompts('en', 17)[0].id).toBe('revenue');
  expect(contextualPrompts('en', 17, '1A')[0].prompt).toBe('Élèves de la classe 1A');
});
