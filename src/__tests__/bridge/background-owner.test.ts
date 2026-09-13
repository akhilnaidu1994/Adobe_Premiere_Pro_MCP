import vm from 'vm';
import path from 'path';
import { loadPanel } from '../helpers/panel.js';
const fs = jest.requireActual<typeof import('fs')>('fs');
const net = jest.requireActual<typeof import('net')>('net');
const moduleObject = { exports: {} as any };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../../cep-plugin/bridge-owner.js'), 'utf8'), { module: moduleObject, Date });
const Owner = moduleObject.exports;
const until = async (predicate: () => boolean) => {
  const deadline = Date.now() + 2500;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('ownership transition timed out');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
};

describe('background bridge ownership', () => {
  it('allows one owner, fails closed on contention, then transfers after release', async () => {
    const reservation = net.createServer();
    await new Promise<void>((resolve, reject) => { reservation.once('error', reject); reservation.listen(0, '127.0.0.1', resolve); });
    const port = (reservation.address() as import('net').AddressInfo).port;
    await new Promise<void>(resolve => reservation.close(() => resolve()));
    const first = new Owner(net, port);
    const second = new Owner(net, port);
    try {
      first.acquire();
      second.acquire();
      await until(() => first.owned || second.owned);
      const winner = first.owned ? first : second;
      const loser = first.owned ? second : first;
      await until(() => loser.error === 'EADDRINUSE');
      expect(loser.owned).toBe(false);
      winner.release();
      loser.lastAttempt = 0;
      loser.acquire();
      await until(() => loser.owned);
      expect(winner.owned).toBe(false);
    } finally { first.release(); second.release(); }
  });

  it('does not emit a heartbeat or execute scripts from a standby context', () => {
    const { bridge, fs: fakeFs } = loadPanel();
    bridge.owner.owned = false;
    bridge.getTempDirectory = () => '/tmp/test-bridge';
    bridge.writeHeartbeat();
    expect(fakeFs.writeFileSync).not.toHaveBeenCalled();
    const callback = jest.fn();
    bridge.executeExtendScript('return 1;', callback);
    expect(callback.mock.calls[0][0].message).toMatch(/does not own/);
  });

  it('holds ownership while a paused native call is outstanding', () => {
    const { bridge, fs: fakeFs } = loadPanel();
    fakeFs.existsSync.mockReturnValue(true);
    (fakeFs as any).readFileSync = () => JSON.stringify({ enabled: false });
    bridge.controlPath = () => '/tmp/control.json';
    bridge.updateUI = () => {};
    bridge.evalScriptBusy = true;
    bridge.pollBridge();
    expect(bridge.owner.release).not.toHaveBeenCalled();
    bridge.evalScriptBusy = false;
    bridge.pollBridge();
    expect(bridge.owner.release).toHaveBeenCalledTimes(1);
  });

  it('keeps the native marker after timeout and clears it only on native completion', () => {
    jest.useFakeTimers();
    try {
      const { bridge, fs: fakeFs } = loadPanel();
      const removed: string[] = [];
      (fakeFs as any).unlinkSync = (p: string) => removed.push(p);
      bridge.inFlightPath = () => '/tmp/native-marker.json';
      let nativeCallback: (result: string) => void = () => {};
      bridge.csInterface.evalScript = (_script: string, callback: typeof nativeCallback) => { nativeCallback = callback; };
      const result = jest.fn();
      bridge.executeExtendScript('return 1;', result);
      expect(fakeFs.writeFileSync).toHaveBeenCalledWith('/tmp/native-marker.json', expect.any(String));
      jest.advanceTimersByTime(45000);
      expect(result.mock.calls[0][0].message).toMatch(/timed out/);
      expect(removed).toEqual([]);
      expect(bridge.evalScriptBusy).toBe(true);
      nativeCallback('1');
      jest.advanceTimersByTime(0);
      expect(removed).toContain('/tmp/native-marker.json');
      expect(bridge.evalScriptBusy).toBe(false);
    } finally { jest.useRealTimers(); }
  });

  it('blocks replay after a native call with unknown outcome', () => {
    const { bridge, fs: fakeFs } = loadPanel();
    bridge.controlPath = () => '/tmp/control.json';
    bridge.inFlightPath = () => '/tmp/inflight.json';
    fakeFs.existsSync.mockImplementation((p: string) => p === '/tmp/inflight.json');
    bridge.updateUI = () => {};
    bridge.watchDirectory = jest.fn();
    bridge.pollBridge();
    expect(bridge.isConnected).toBe(false);
    expect(bridge.watchDirectory).not.toHaveBeenCalled();
  });

  it('never polls the command directory without ownership', () => {
    const { bridge } = loadPanel();
    bridge.owner.owned = false;
    bridge.updateUI = () => {};
    bridge.watchDirectory = jest.fn();
    bridge.pollBridge();
    expect(bridge.owner.acquire).toHaveBeenCalled();
    expect(bridge.watchDirectory).not.toHaveBeenCalled();
  });
});
