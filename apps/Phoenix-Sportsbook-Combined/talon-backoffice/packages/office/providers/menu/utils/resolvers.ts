import { MenuItem, MenuItemGrouped } from "../../../types/menu";
import { defaultGroupIcons } from "../defaults";

export const isActive = (item: MenuItem, path: string): boolean => {
  const itemPath = item.absolutePath || item.path;
  const isRoot = path === "/";
  if (isRoot) {
    return path === itemPath;
  } else if (!isRoot && itemPath !== "/") {
    return path.indexOf(itemPath) === 0 || path === itemPath;
  }
  return false;
};

export const groupItems = (
  items: MenuItem[],
  parentPath: string = "",
): MenuItemGrouped[] =>
  items.reduce((prev: MenuItemGrouped[], curr: MenuItem) => {
    const { children, ...rest } = curr;
    const found = prev.find((item) => item.key === curr.group);
    if (found) {
      return prev.map((item: MenuItemGrouped) => {
        if (item.key === curr.group) {
          return {
            ...item,
            children: [
              ...item.children,
              {
                ...curr,
                absolutePath: `${parentPath}${curr.path}`,
              },
            ],
          };
        }
        return item;
      });
    }
    return [
      ...prev,
      {
        key: rest.group,
        label: `GROUP_${rest?.group?.toUpperCase()}`,
        icon: rest.group ? defaultGroupIcons[rest.group] : undefined,
        children: [
          {
            ...rest,
            absolutePath: `${parentPath}${rest.path}`,
          },
        ],
      } as MenuItemGrouped,
    ];
  }, [] as MenuItemGrouped[]);
