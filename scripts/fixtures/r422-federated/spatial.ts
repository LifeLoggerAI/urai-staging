/** Preserve only the selected owner's explicit Studio movie selector across
 * original Life Map -> Focus -> Replay travel. A URL never grants authority:
 * Studio verifies BOTH current Firebase identities, account link, consent,
 * movie-plan ownership and Jobs binding on every protected HTTP request.
 */
const PLAN = /^lmp_[A-Za-z0-9_-]{20,64}$/
const MOVIE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/

type QueryReader = Pick<URLSearchParams, 'get' | 'getAll'>
export type SelectedPrivateMovieRoute = {
  memoryId: string
  manifestId: string
  authorizedOwner: boolean
  demo: boolean
}
export type PrivateMovieRouteSelection = { movieId: string; planId: string }

export function readPrivateMovieRouteSelection(query: QueryReader, memory: SelectedPrivateMovieRoute): PrivateMovieRouteSelection | null {
  if (!memory.authorizedOwner || memory.demo || query.get('demo') !== null) return null
  const required = ['memoryId', 'manifestId', 'movieId', 'lifeMoviePlanId'] as const
  if (required.some(name => query.getAll(name).length !== 1)) return null
  if (query.get('memoryId') !== memory.memoryId || query.get('manifestId') !== memory.manifestId) return null
  const movieId = query.get('movieId') ?? '', planId = query.get('lifeMoviePlanId') ?? ''
  if (!MOVIE.test(movieId) || !PLAN.test(planId)) return null
  return { movieId, planId }
}

export function forwardPrivateMovieRouteSelection(target: URLSearchParams, source: QueryReader, memory: SelectedPrivateMovieRoute): boolean {
  const selected = readPrivateMovieRouteSelection(source, memory)
  if (!selected) return false
  target.set('movieId', selected.movieId)
  target.set('lifeMoviePlanId', selected.planId)
  return true
}

export function selectedPrivateMovieFromBrowserLocation(location: string, memory: SelectedPrivateMovieRoute): PrivateMovieRouteSelection | null {
  const value = location.split('#')[0]
  const question = value.indexOf('?')
  if (question < 0 || !['/focus', '/replay'].includes(value.slice(0, question).replace(/\/+$/, ''))) return null
  return readPrivateMovieRouteSelection(new URLSearchParams(value.slice(question + 1)), memory)
}
