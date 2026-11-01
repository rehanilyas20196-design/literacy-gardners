'use client';

import BookShowcase3D, { YOUNG_AUTHORS_BOOKS } from './BookShowcase3D';

export { YOUNG_AUTHORS_BOOKS };
export default function SpiralFlux(props) {
  return <BookShowcase3D {...props} />;
}
