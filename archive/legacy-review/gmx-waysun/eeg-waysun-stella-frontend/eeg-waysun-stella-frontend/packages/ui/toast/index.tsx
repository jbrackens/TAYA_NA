import React from "react";
import ReactDOM from "react-dom";
import { Toast } from "./Toast";

enum ToastTypesEnums {
  DEFAULT = "default",
  SUCCESS = "success",
  ERROR = "error",
  INFO = "info",
}
class ToastMessageClass {
  private containerRef = null;
  private message: string = "";
  private toastType: "default" | "success" | "info" | "error" | undefined =
    "default";
  private displayToast: boolean = false;

  private createToastMainContainer(): void {
    const body = document.getElementsByTagName("body")[0] as HTMLBodyElement;
    const toastContainer = document.createElement("div");
    toastContainer.id = "toast-container-main";
    body.insertAdjacentElement("beforeend", toastContainer);
    this.containerRef = toastContainer;
    this.render();
  }

  private closeToast = () => {
    this.displayToast = false;
    this.render();
    setTimeout(() => {
      document.getElementById("toast-container-main")?.remove();
    }, 200);
  };

  private setToastData = (
    message: string,
    type: "default" | "success" | "info" | "error" | undefined,
    duration: number = 2500,
  ) => {
    this.createToastMainContainer();
    // SetTimeOut to make it sequential
    setTimeout(() => {
      this.message = message;
      this.toastType = type;
      this.displayToast = true;
      this.render();
      setTimeout(() => {
        this.closeToast();
      }, duration);
    });
  };

  public success(message: string, duration?: number): void {
    this.setToastData(message, ToastTypesEnums.SUCCESS, duration);
  }

  public error(message: string, duration?: number): void {
    this.setToastData(message, ToastTypesEnums.ERROR, duration);
  }

  public default(message: string, duration?: number): void {
    this.setToastData(message, ToastTypesEnums.DEFAULT, duration);
  }

  public info(message: string, duration?: number): void {
    this.setToastData(message, ToastTypesEnums.INFO, duration);
  }

  private render(): void {
    const toast = (
      <Toast show={this.displayToast} type={this.toastType}>
        {this.message}
      </Toast>
    );

    this.containerRef && ReactDOM.render(toast, this.containerRef);
  }
}

export const message = new ToastMessageClass();
