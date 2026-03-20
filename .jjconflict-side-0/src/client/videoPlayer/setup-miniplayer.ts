import { miniplayerFullscreenButtonEl, videoEl } from '~c/elements'
import { videoPlayerStore } from '~c/stores'
import { router } from '~/router'

miniplayerFullscreenButtonEl.addEventListener('click', () => {
  videoEl.controls = false

  const videoPlayerState = videoPlayerStore.state

  if (videoPlayerState.id && videoPlayerState.ep) {
    router.navigate({
      to: '/anime/$id/episode/$number',
      params: {
        id: videoPlayerState.id,
        number: videoPlayerState.ep,
      },
    })
  }
})
