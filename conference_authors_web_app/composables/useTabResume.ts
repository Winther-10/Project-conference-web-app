// composables/useTabResume.ts
// Watches the tabResumeCount provided by the portal layout.
// When the Chrome tab becomes visible again, calls the provided callback.

export const useTabResume = (callback: () => void) => {
  const tabResumeCount = inject<Ref<number>>('tabResumeCount', ref(0));

  watch(tabResumeCount, (newCount) => {
    if (newCount > 0) {
      callback();
    }
  });
};
