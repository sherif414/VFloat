<script setup lang="ts">
import Menu from "../components/Menu.vue"
import MenuTrigger from "../components/MenuTrigger.vue"
import MenuDropdown from "../components/MenuDropdown.vue"
import MenuItem from "../components/MenuItem.vue"
import SubMenu from "../components/SubMenu.vue"
</script>


<template>
  <section class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-4 py-12">
    <div class="w-full max-w-lg">
      <!-- Card Container -->
      <div class="rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        <!-- Header -->
        <div class="border-b border-slate-100 px-6 py-5">
          <h2 class="text-lg font-semibold text-slate-900">Account Settings</h2>
          <p class="mt-1 text-sm text-slate-500">Manage your workspace and preferences</p>
        </div>

        <div class="p-6">
          <Menu>
            <MenuTrigger class="menu-trigger group relative w-full">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-semibold text-white shadow-lg">
                  TW
                </div>

                <!-- Text Content -->
                <div class="flex-1 text-left">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-slate-900">Team Workspace</span>
                    <span class="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                      Live
                    </span>
                  </div>
                  <p class="text-xs text-slate-500">admin@company.com</p>
                </div>

                <!-- Chevron -->
                <svg class="h-5 w-5 text-slate-400 transition-transform group-aria-expanded:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </MenuTrigger>

            <MenuDropdown class="menu-dropdown">
              <div class="py-1">
                <MenuItem class="menu-item">
                  <div class="flex items-center justify-between gap-4">
                    <div class="flex items-center gap-3">
                      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                        <svg class="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <p class="text-sm font-medium text-slate-900">Profile Settings</p>
                        <p class="text-xs text-slate-500">Avatar, pronouns & timezone</p>
                      </div>
                    </div>
                    <kbd class="hidden rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 sm:inline-block">⌘P</kbd>
                  </div>
                </MenuItem>

                <MenuItem class="menu-item">
                  <div class="flex items-center justify-between gap-4">
                    <div class="flex items-center gap-3">
                      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50">
                        <svg class="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      </div>
                      <div>
                        <p class="text-sm font-medium text-slate-900">Notifications</p>
                        <p class="text-xs text-slate-500">Quiet hours & channel reach</p>
                      </div>
                    </div>
                    <span class="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">New</span>
                  </div>
                </MenuItem>

                <div class="my-1 h-px bg-slate-100"></div>

                <SubMenu>
                  <MenuTrigger class="menu-item submenu-trigger">
                    <div class="flex items-center gap-3">
                      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                        <svg class="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                      </div>
                      <span class="text-sm font-medium text-slate-900">Workspace Tools</span>
                    </div>
                    <svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </MenuTrigger>

                  <MenuDropdown class="menu-dropdown submenu-dropdown">
                    <div class="py-1">
                      <MenuItem class="menu-item">
                        <div class="flex items-center gap-3">
                          <svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p class="text-sm font-medium text-slate-900">About This Team</p>
                            <p class="text-xs text-slate-500">Mission & ownership map</p>
                          </div>
                        </div>
                      </MenuItem>

                      <MenuItem class="menu-item">
                        <div class="flex items-center gap-3">
                          <svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          <div>
                            <p class="text-sm font-medium text-slate-900">Help Desk</p>
                            <p class="text-xs text-slate-500">Contact ops or browse docs</p>
                          </div>
                        </div>
                      </MenuItem>

                      <MenuItem :disabled="true" class="menu-item">
                        <div class="flex items-center gap-3 opacity-50">
                          <svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <div>
                            <p class="text-sm font-medium text-slate-900">Keyboard Labs</p>
                            <p class="text-xs text-slate-500">Coming soon</p>
                          </div>
                        </div>
                      </MenuItem>
                    </div>
                  </MenuDropdown>
                </SubMenu>

                <SubMenu>
                  <MenuTrigger class="menu-item submenu-trigger">
                    <div class="flex items-center gap-3">
                      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
                        <svg class="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </div>
                      <span class="text-sm font-medium text-slate-900">Support</span>
                    </div>
                    <svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </MenuTrigger>

                  <MenuDropdown class="menu-dropdown submenu-dropdown">
                    <div class="py-1">
                      <MenuItem class="menu-item">
                        <div class="flex items-center gap-3">
                          <svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <span class="text-sm font-medium text-slate-900">Advanced Analytics</span>
                        </div>
                      </MenuItem>

                      <MenuItem class="menu-item">
                        <div class="flex items-center gap-3">
                          <svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span class="text-sm font-medium text-slate-900">Escalations</span>
                        </div>
                      </MenuItem>
                    </div>
                  </MenuDropdown>
                </SubMenu>

                <div class="my-1 h-px bg-slate-100"></div>

                <MenuItem class="menu-item">
                  <div class="flex items-center justify-between gap-4">
                    <div class="flex items-center gap-3">
                      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
                        <svg class="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </div>
                      <div>
                        <p class="text-sm font-medium text-slate-900">Sign Out</p>
                        <p class="text-xs text-slate-500">Save unsent drafts first</p>
                      </div>
                    </div>
                    <kbd class="hidden rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 sm:inline-block">⇧⌘Q</kbd>
                  </div>
                </MenuItem>
              </div>
            </MenuDropdown>
          </Menu>
        </div>
      </div>

      <!-- Footer Info -->
      <div class="mt-6 text-center">
        <p class="text-sm text-slate-600">
          Click to open •
          <kbd class="mx-1 rounded bg-white px-2 py-0.5 text-xs font-medium text-slate-700 shadow ring-1 ring-slate-200">Tab</kbd>
          to navigate •
          <kbd class="mx-1 rounded bg-white px-2 py-0.5 text-xs font-medium text-slate-700 shadow ring-1 ring-slate-200">Esc</kbd>
          to close
        </p>
      </div>
    </div>
  </section>
</template>

<style>
/* Menu Trigger Styles */
.menu-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  transition: all 0.2s;
  cursor: pointer;
}

.menu-trigger:hover {
  background: rgb(241 245 249);
  border-color: rgb(203 213 225);
}

.menu-trigger:focus-visible {
  outline: 2px solid rgb(99 102 241);
  outline-offset: 2px;
}

.menu-trigger[aria-expanded="true"] {
  background: rgb(241 245 249);
  border-color: rgb(99 102 241);
  box-shadow: 0 0 0 3px rgb(199 210 254 / 0.3);
}

/* Menu Dropdown Styles */
.menu-dropdown {
  min-width: 320px;
  margin-top: 0.5rem;
  border-radius: 0.75rem;
  background: white;
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  border: 1px solid rgb(226 232 240);
  overflow: hidden;
  z-index: 50;
}

/* Submenu Dropdown Positioning */
.submenu-dropdown {
  margin-top: 0;
  margin-left: 0.5rem;
}

/* Menu Item Styles */
.menu-item {
  display: block;
  width: 100%;
  padding: 0.625rem 0.875rem;
  cursor: pointer;
  transition: background-color 0.15s;
  user-select: none;
}

.menu-item:hover:not([data-disabled]) {
  background: rgb(248 250 252);
}

.menu-item:focus {
  outline: none;
}

.menu-item[data-active]:not([data-disabled]) {
  background: rgb(238 242 255);
}

.menu-item[data-disabled] {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Submenu Trigger within MenuItem */
.submenu-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.875rem;
  width: 100%;
  cursor: pointer;
  transition: background-color 0.15s;
  border: none;
  background: transparent;
  text-align: left;
}

.submenu-trigger:hover {
  background: rgb(248 250 252);
}

.submenu-trigger:focus-visible {
  outline: 2px solid rgb(99 102 241);
  outline-offset: -2px;
  border-radius: 0.375rem;
}

.submenu-trigger[aria-expanded="true"] {
  background: rgb(238 242 255);
}
</style>
