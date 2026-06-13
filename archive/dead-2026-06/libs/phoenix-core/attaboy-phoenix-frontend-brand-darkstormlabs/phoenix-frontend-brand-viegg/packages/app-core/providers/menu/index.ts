import React from "react";
import { detaultMenuItems } from "./defaults";

const MenuContext = React.createContext(detaultMenuItems);
const { Provider: MenuProvider, Consumer: MenuConsumer } = MenuContext;

export { MenuProvider, MenuConsumer, detaultMenuItems };
export default MenuContext;
