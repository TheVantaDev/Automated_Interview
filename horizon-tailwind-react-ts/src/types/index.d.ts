// Route type used by sidebar and admin layout
type RoutesType = {
  name: string;
  layout: string;
  path: string;
  icon?: JSX.Element | string;
  component: JSX.Element;
  secondary?: boolean;
};
