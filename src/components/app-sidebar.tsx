import {
  IconBox,
  IconGrid4x4,
  IconHierarchy2,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconSettings,
} from '@tabler/icons-react'
import { Link, useRouterState } from '@tanstack/react-router'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'

const navItems = [
  {
    label: 'Workflow Editor',
    icon: IconHierarchy2,
    to: '/workflows',
  },
  {
    label: 'Material Viewer',
    icon: IconBox,
    to: '/material-viewer',
  },
  {
    label: 'Repeat Tester',
    icon: IconGrid4x4,
    to: '/repeat-tester',
  },
]

function CollapseButton() {
  const { toggleSidebar, state } = useSidebar()
  const isCollapsed = state === 'collapsed'
  return (
    <SidebarMenuButton onClick={toggleSidebar} tooltip="Expand sidebar">
      {isCollapsed ? <IconLayoutSidebarLeftExpand /> : <IconLayoutSidebarLeftCollapse />}
      <span>Collapse</span>
    </SidebarMenuButton>
  )
}

export function AppSidebar() {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  })

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center">
                  <img
                    src="/material-studio-logo.png"
                    alt="Material Studio"
                    className="size-6"
                  />
                </div>
                <span className="font-semibold tracking-tight text-sm">
                  Material Studio
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.to || pathname.startsWith(item.to + '/')}
                    tooltip={item.label}
                  >
                    <Link to={item.to}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/settings'}
              tooltip="Settings"
            >
              <Link to="/settings">
                <IconSettings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <CollapseButton />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
