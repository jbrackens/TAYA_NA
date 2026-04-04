import React from "react";
import { defaultMenuItems } from "./defaults";

const MenuContext = React.createContext(defaultMenuItems);
const { Provider: MenuProvider, Consumer: MenuConsumer } = MenuContext;

export { MenuProvider, MenuConsumer, defaultMenuItems };
export default MenuContext;
