<script setup lang="ts">
import Menu from "../components/Menu.vue"
import MenuTrigger from "../components/MenuTrigger.vue"
import MenuDropdown from "../components/MenuDropdown.vue"
import MenuItem from "../components/MenuItem.vue"
import SubMenu from "../components/SubMenu.vue"
</script>

<template>
  <div class="menu-demo">
    <h2>Menu Demo (Keyboard + Hover)</h2>
    <p class="description">
      Use the keyboard (Arrow keys, Home/End, Escape) or hover to explore nested menus with disabled
      items and safe hover between parent and child menus.
    </p>

    <Menu>
      <MenuTrigger> Open Menu ▾ </MenuTrigger>

      <MenuDropdown>
        <MenuItem label="Profile" />
        <MenuItem label="Settings" />

        <SubMenu>
          <MenuTrigger> More ▸ </MenuTrigger>
          <MenuDropdown>
            <MenuItem label="About" />
            <MenuItem label="Help" />
            <MenuItem label="Keyboard only item" :disabled="true" />
          </MenuDropdown>
        </SubMenu>

        <SubMenu>
          <MenuTrigger> More 2 ▸ </MenuTrigger>
          <MenuDropdown>
            <MenuItem label="Advanced" />
            <MenuItem label="Support" />
          </MenuDropdown>
        </SubMenu>

        <MenuItem label="Sign out" />
      </MenuDropdown>
    </Menu>

    <div class="hints">
      <p><strong>Keyboard:</strong> Focus the trigger, then use ArrowDown/ArrowUp, Home/End, and Escape.</p>
      <p><strong>Hover:</strong> Move between "More" submenus and their panels; they stay open through the safe zone.</p>
      <p><strong>Dismissal:</strong> Press Escape to close the deepest open menu, or click outside to close all.</p>
    </div>
  </div>
</template>

<style scoped>
.menu-demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
}

h2 {
  margin: 0;
  font-size: 18px;
  color: #111827;
}

.description {
  margin: 0;
  font-size: 14px;
  color: #4b5563;
}

.menu-trigger-button {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #f9fafb;
  cursor: pointer;
}

.menu-panel {
  margin-top: 6px;
}

.hints {
  font-size: 13px;
  color: #4b5563;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
