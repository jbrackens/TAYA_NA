import("jest-fetch-mock");
import MatchMediaMock from 'jest-matchmedia-mock';
import { render, act, cleanup, screen } from '@testing-library/react';
import { setupLocalStorageMock } from '../../../__mocks__/localstorage';
import { setupProcessMock } from '../../../__mocks__/process';
import { first } from 'lodash';
import { Provider } from 'react-redux';
import store from '../../../store';
import LifecycleSuspend from '../suspend';
import LifecycleCancel from '../cancel';

setupLocalStorageMock();
setupProcessMock();

let matchMedia: any;
const fetch = global.fetch;
const apiUrl = 'http://fake.url';

jest.mock("next/config", () => ({
  default: () => ({
    publicRuntimeConfig: {
      API_GLOBAL_ENDPOINT: 'http://fake.url',
    },
  }),
}));

const AllTheProviders = ({ children }: any) => {
  return <Provider store={store}>{children}</Provider>;
};

describe("Components: Lifecycle - Suspend", () => {

  const renderProps = {
    id: 'sample-id',
    url: 'app-url/:action/:id',
    labels: {
      active: 'LABEL_ACTIVE',
      inactive: 'LABEL_INACTIVE',
    },
    onComplete: jest.fn(),
  };

  const renderSuspendButton = (props: any) =>
    render(<LifecycleSuspend 
      { ...props } />, {
        wrapper: AllTheProviders,
      });

  beforeAll(() => {
    matchMedia = new MatchMediaMock();
  });

  beforeEach(() => {
    cleanup();
    fetch.resetMocks();

    fetch.doMock(async (req) => {
      return Promise.resolve({
        body: JSON.stringify({
          unfreeze: req.url.includes('/unfreeze/'),
          freeze: req.url.includes('/freeze/'),
        }),
        status: 200,
      });
    });
  });
 
  afterEach(() => {
    fetch.mockRestore();
    matchMedia.clear();
    renderProps.onComplete.mockRestore();
  });
  test("Shouldn't display", async () => {
    await act(async () => {
      renderSuspendButton({
        ...renderProps,
        active: false,
        visible: false,
      });
    });

    let result: any = true;
    try {
      result = await screen.findAllByRole('button')
    } catch(e) {
      result = false;
    }

    expect(result).toBeFalsy();
  });

  test("Should display inactive", async () => {
    await act(async () => {

      renderSuspendButton({
        ...renderProps,
        active: false,
        visible: true,
      });
    });

    const result = await screen.findByRole('button');
    
    expect(result).toBeTruthy();
    expect(result.textContent).toBe('LABEL_INACTIVE');
  });

  test("Should display active", async () => {
    await act(async () => {
      renderSuspendButton({
        ...renderProps,
        active: true,
        visible: true,
      });
    });

    const result = await screen.findByRole('button');
    
    expect(result).toBeTruthy();
    expect(result.textContent).toBe('LABEL_ACTIVE');
  });

  test("Should trigger de-activate action", async () => {
    await act(async () => {
      renderSuspendButton({
        ...renderProps,
        active: true,
        visible: true,
      });
      const result = await screen.findByRole('button');
      result.click();
    });

    expect(fetch.mock.calls[0][0]).toBe(`${apiUrl}/app-url/unfreeze/sample-id`);

    const callResult = await first(fetch.mock.results)?.value;

    expect(await callResult.json()).toEqual({
      unfreeze: true,
      freeze: false,
    });
    expect(renderProps.onComplete).toHaveBeenCalledTimes(1);
  });

  test("Should trigger activate action", async () => {
    await act(async () => {
      renderSuspendButton({
        ...renderProps,
        active: false,
        visible: true,
      });
      const result = await screen.findByRole('button');
      result.click();
    });

    expect(fetch.mock.calls[0][0]).toBe(`${apiUrl}/app-url/freeze/sample-id`);

    const callResult = await first(fetch.mock.results)?.value;

    expect(await callResult.json()).toEqual({
      unfreeze: false,
      freeze: true,
    });
    expect(renderProps.onComplete).toHaveBeenCalledTimes(1);
  });
});

describe("Components: Lifecycle - Cancel", () => {

  const renderProps = {
    id: 'sample-id',
    url: 'app-url/:action/:id',
    label: 'LABEL_CANCEL',
    onComplete: jest.fn(),
  };

  const renderCancelButton = (props: any) =>
    render(<LifecycleCancel 
      { ...props } />, {
        wrapper: AllTheProviders,
      });

  beforeAll(() => {
    matchMedia = new MatchMediaMock();
  });

  beforeEach(() => {
    cleanup();
    fetch.resetMocks();

    fetch.doMock(async (req) => {
      return Promise.resolve({
        body: JSON.stringify({
          cancel: req.url.includes('/cancel/'),
        }),
        status: 200,
      });
    });
  });
 
  afterEach(() => {
    fetch.mockRestore();
    matchMedia.clear();
    renderProps.onComplete.mockRestore();
  });

  test("Shouldn't display", async () => {
    await act(async () => {
      renderCancelButton({
        ...renderProps,
        visible: false,
      });
    });

    let result: any = true;
    try {
      result = await screen.findAllByRole('button')
    } catch(e) {
      result = false;
    }

    expect(result).toBeFalsy();
  });

  test("Should display", async () => {
    await act(async () => {
      renderCancelButton({
        ...renderProps,
        visible: true,
      });
    });

    const result = await screen.findByRole('button');
    
    expect(result).toBeTruthy();
    expect(result.textContent).toBe('LABEL_CANCEL');
  });

  test("Should trigger cancel action", async () => {
    await act(async () => {
      renderCancelButton({
        ...renderProps,
        visible: true,
      });
      const result = await screen.findByRole('button');
      result.click();
    });

    expect(fetch.mock.calls[0][0]).toBe(`${apiUrl}/app-url/cancel/sample-id`);

    const callResult = await first(fetch.mock.results)?.value;

    expect(await callResult.json()).toEqual({
      cancel: true,
    });
    expect(renderProps.onComplete).toHaveBeenCalledTimes(1);
  });

});
