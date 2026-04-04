import { actions } from "./actions";
import { Field } from "../model/field";

interface Target {
  id: string;
  target: Window;
}

interface Response {
  id: string;
  data: FormData;
}

interface FormData {
  errors?: { [key: string]: string };
  encCvv?: string;
  encCreditcardNumber?: string;
}

interface Config {
  // The payment iq mid
  merchantId: string;
  // Return each field as separate iframes or all fields in a single iframe
  renderMode?: "single" | "multiple";
  // List of fields to host
  fields: Field[];
  // Url to the hosted fields
  hostedfieldsurl: string;
  // Styles
  styles: string;
  // Service
  service?: string;
  // Element to render the hosted fields on.
  el: string;
  // Method to call when all responses from hosted fields
  // has been loaded
  onLoadCallback?: () => () => void;
  // Method to call when all responses from hosted fields
  // has been collected.
  callback: () => (data: any) => void;
}

// The payment iq mid
let merchantId: string | undefined | null;
// List of fields to host
let fields: Field[] | undefined | null;
// Url to the hosted fields
let hostedfieldsurl: string | undefined | null;
// Service
let service: string | undefined | null;
// External styles for hosted fields.
let styles: string | undefined | null;
// The hosted fields.
let targets: Target[] = [];
// Responses gotten from the hosted fields.
let responses: Response[] = [];
// Element to render the hosted fields on.
let el: string | undefined | null;
// Method to call when all responses from hosted fields
// has been collected.
let callback: undefined | null | (() => (data: any) => void);
// Method to call when all responses from hosted fields
// has been loaded
let onLoadCallback: undefined | null | (() => () => void);
// Keep track of number of loaded fields
let onLoadCounter = 0;
// This window.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
let window: (Window & typeof globalThis) | null | undefined;

function setup(config: Config) {
  merchantId = config.merchantId;
  hostedfieldsurl = config.hostedfieldsurl;
  fields = config.fields;
  service = config.service;
  styles = config.styles;
  callback = config.callback;
  onLoadCallback = config.onLoadCallback;
  el = config.el;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  window = document.parentWindow || document.defaultView;

  registerIframes();
}

function get() {
  targets.forEach(item => {
    item.target.postMessage(
      { action: actions.get, merchantId, id: item.id },
      "*"
    );
  });
}

function reset() {
  targets = [];
}
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
function destroyContent() {
  merchantId = null;
  fields = null;
  hostedfieldsurl = null;
  service = null;
  styles = null;
  targets = [];
  responses = [];
  el = null;
  callback = null;
  onLoadCallback = null;
  onLoadCounter = 0;
}

function registerIframes() {
  targets = targets.concat(
    fields!.map(field => {
      return initIframe(field);
    })
  );
}

function eventHandler($event: any) {
  switch ($event.data.action) {
    case actions.formData:
      responses.push({ id: $event.data.id, data: $event.data.formData });
      sendCallback();
      break;
    case actions.formSubmit:
      get();
      break;
  }
}

function sendCallback() {
  const responseIds = responses.map(response => response.id);
  const targetIds = targets.map(target => target.id);
  if (responseIds.length !== targetIds.length) return;
  let includesAllIds = true;
  targetIds.forEach(targetId => {
    includesAllIds = responseIds.includes(targetId);
  });

  // Check that we have gotten responses from all hosted fields.
  // Before sending the callback.
  if (includesAllIds) {
    const data = responses.reduce((formData: FormData, response) => {
      const { errors, ...data } = formData;
      const { errors: fieldErrors, ...fieldData } = response.data;
      const newData = { ...data, ...fieldData } as FormData;
      const allErrors = { ...errors, ...fieldErrors };
      if (Object.keys(allErrors).length > 0) {
        newData.errors = allErrors;
      }
      return newData;
    }, {});
    // Reset the responses.
    responses = [];
    if (callback) {
      callback()(data);
    }
  }
}

// Sets up a single iframe for each field
function initIframe(field: Field) {
  const iframe = document.createElement("iframe");
  iframe.id = "hosted-field-" + field.id;
  iframe.name = "hosted-field-" + field.id;
  // iframe.tabIndex = '-1'; // This disabled the possibility to set focus on the frame and any of its contents.

  // This is hostedfieldsurl
  iframe.src = hostedfieldsurl + "?mid=" + merchantId;
  const container = document.querySelector(el!);

  const iframeContainerEl = document.createElement("div");
  iframeContainerEl.id = "hosted-field-container-" + field.id;
  iframeContainerEl.className = "hosted-field-container";
  iframeContainerEl.appendChild(iframe);

  if (container) {
    container.appendChild(iframeContainerEl);
  }

  const targetIframe = document.querySelector(
    "#" + iframe.id
  ) as HTMLIFrameElement;
  // Get the target window...
  const target = targetIframe!.contentWindow!;
  // Attach onload event listener to iframe so we can send the
  // setupContent event when iframe is fully loaded.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  iframe.onload = createIframeProxy.bind(this, field, target);
  return {
    id: iframe.id,
    target
  };
}

function createIframeProxy(field: Field, target: Window) {
  const fieldsObj: { [key: string]: Field } = {};
  fieldsObj[field.name] = field;
  window && window.addEventListener("message", eventHandler, false);
  target.postMessage(
    {
      action: actions.setupContent,
      styles: styles,
      fields: fieldsObj,
      service: service
    },
    "*"
  );

  onLoadCounter++;
  if (onLoadCounter === fields!.length && onLoadCallback) {
    onLoadCallback()();
    onLoadCounter = 0;
  }
}

export const HostedFields = {
  // Setup hosted fields
  setup,
  // Get the data from the hosted fields.
  get,
  // reset the current targets
  reset
};
