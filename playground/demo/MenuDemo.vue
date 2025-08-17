<script setup lang="ts">
import Menu from "../components/Menu.vue"
import MenuTrigger from "../components/MenuTrigger.vue"
import MenuDropdown from "../components/MenuDropdown.vue"
import MenuItem from "../components/MenuItem.vue"
import SubMenu from "../components/SubMenu.vue"
</script>

<template>
  <div class="menu-demo">
    <h2>Menu Demo</h2>

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
          </MenuDropdown>
        </SubMenu>

        <SubMenu>
          <MenuTrigger> More 2▸ </MenuTrigger>
          <MenuDropdown>
            <MenuItem label="About" />
            <MenuItem label="Help" />
          </MenuDropdown>
        </SubMenu>

        <MenuItem label="Sign out" />
      </MenuDropdown>
    </Menu>
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
</style>
