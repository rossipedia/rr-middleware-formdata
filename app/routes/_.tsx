import { Outlet } from 'react-router';

export default function Component() {
  return (
    <div className="prose container mx-auto max-w-3xl my-8">
      <Outlet />
    </div>
  );
}
