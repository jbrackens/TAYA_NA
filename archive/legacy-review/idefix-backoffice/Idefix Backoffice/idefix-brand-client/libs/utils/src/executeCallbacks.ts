import { UpdateState } from "@brandserver-client/types";

function loadTrackingPixel(url: string) {
  const image = new Image();
  const imageId = "tracking-pixel";
  image.src = url;
  image.id = imageId;
  image.style.visibility = "hidden";
  image.onload = () => image.remove();
  image.onerror = () => image.remove();
  document.body.appendChild(image);
}

function getScript(src: string) {
  const script = document.createElement("script");
  script.src = src;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  script.onload = () => {};
  script.onerror = () => script.remove();
  document.body.appendChild(script);
}

function loadCallbacks(callbacks: string[]) {
  callbacks.forEach(callback => loadTrackingPixel(callback));
}

function loadScripts(scripts: string[]) {
  scripts.forEach(script => getScript(script));
}

function executeScripts(scripts: string[]) {
  scripts.forEach(script => eval(script));
}

function executeClientCallbacks(updates: UpdateState) {
  for (const key in updates) {
    if (key === "callbacks") loadCallbacks(updates[key] as string[]);
    if (key === "scripts") loadScripts(updates[key] as string[]);
    if (key === "executes") executeScripts(updates[key] as string[]);
  }
}

function executeServerCallbacks(updates: UpdateState) {
  for (const key in updates) {
    if (key === "serverCallbacks") loadCallbacks(updates[key] as string[]);
    if (key === "serverScripts") loadScripts(updates[key] as string[]);
    if (key === "serverExecutes") executeScripts(updates[key] as string[]);
  }
}

export { executeClientCallbacks, executeServerCallbacks };
