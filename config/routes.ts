export default [
  {
    path: '/',
    key: 'dashboard',
    layout: false,
    icon: 'home',
    redirect: '/dashboard',
    access: 'canLogin'
  },
  {
    name: 'Dashboard',
    path: '/dashboard',
    key: 'dashboard',
    icon: 'home',
    component: './dashboard'
  },
  {
    name: 'Playground',
    title: 'Playground',
    path: '/playground',
    key: 'playground',
    icon: 'Comment',
    component: './playground'
  },
  {
    name: 'Models',
    path: '/models',
    key: 'models',
    icon: 'Block',
    component: './llmodels'
  },
  {
    name: 'Resources',
    path: '/resources',
    key: 'resources',
    icon: 'CloudServer',
    component: './resources'
  },
  {
    name: 'API Keys',
    path: '/api-keys',
    key: 'apikeys',
    icon: 'LockOutlined',
    component: './api-keys'
  },
  {
    name: 'Users',
    path: '/users',
    key: 'users',
    icon: 'Team',
    component: './users'
  },
  {
    name: 'Profile',
    path: '/profile',
    key: 'profile',
    hideInMenu: true,
    component: './profile',
    icon: 'User'
  },
  {
    name: 'Login',
    path: '/login',
    key: 'login',
    layout: false,
    hideInMenu: true,
    component: './login'
  },
  {
    name: '404',
    path: '*',
    key: '404',
    layout: false,
    component: './404'
  }
];
