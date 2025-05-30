<script setup lang="ts">
import Menu from "./components/Menu.vue";
import SubMenu from "./components/SubMenu.vue";
import MenuItem from "./components/MenuItem.vue";
import MenuTrigger from "./components/MenuTrigger.vue";
import MenuDropdown from "./components/MenuDropdown.vue";


</script>

<template>
  <div class="grid place-items-center h-screen">
    ?

    <Menu>
      <MenuTrigger class="bg-blue-4 rounded p4 px-2">Edit Actions</MenuTrigger>

      <MenuDropdown>
        <MenuItem>Undo</MenuItem>
        <MenuItem disabled>Redo</MenuItem>

        <SubMenu>
          <MenuItem>
          <MenuTrigger class="w-full">
            Find
          </MenuTrigger>
          </MenuItem>

          <MenuDropdown>
            <MenuItem label="Find in Files" />
            <MenuItem label="Find Next" />
            <SubMenu>

              <MenuItem>
              <MenuTrigger>
                Advanced Find
              </MenuTrigger>
              </MenuItem>

              <MenuDropdown>
                <MenuItem label="Regex Search" />
                <MenuItem label="Case Sensitive Search" />
              </MenuDropdown>
            </SubMenu>
          </MenuDropdown>

        </SubMenu>
        <MenuItem label="Cut" />
        <MenuItem label="Copy" />
        <MenuItem label="Paste" />
      </MenuDropdown>
    </Menu>
  </div>
</template>

<style>
html,
body,
#app {
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f8f9fa;
  /* Light background for better contrast */
  color: #212529;
}

/* Add some global spacing for menu items if needed, or keep it scoped */
</style>