<script setup>
import { useAuth } from '~/composables/useAuth';
const { init } = useAuth();
// callOnce runs exactly once, server+client, BEFORE routing - auth is ready before any page loads
await callOnce(init);
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
