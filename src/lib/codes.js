import crypto from 'node:crypto'

// Easy-to-read join codes (no 0/O or 1/I mix-ups), e.g. "K7MPQ2".
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function makeJoinCode(length = 6) {
  return Array.from({ length }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('')
}
