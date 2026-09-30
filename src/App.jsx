import { useEffect, useRef, useState } from 'react'
import './App.css'
import gatito from './assets/gatito.jpg'

const HEARTS = ['💖', '💕', '💗', '💘', '💝', '😘', '💋']

function FloatingHearts() {
  // Generate hearts once so they don't reshuffle on re-render
  const hearts = useRef(
    Array.from({ length: 24 }, (_, i) => ({
      id: i,
      emoji: HEARTS[i % HEARTS.length],
      left: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 7 + Math.random() * 8,
      size: 1 + Math.random() * 1.8,
    }))
  ).current

  return (
    <div className="hearts-bg" aria-hidden="true">
      {hearts.map((h) => (
        <span
          key={h.id}
          className="floating-heart"
          style={{
            left: `${h.left}%`,
            animationDelay: `${h.delay}s`,
            animationDuration: `${h.duration}s`,
            fontSize: `${h.size}rem`,
          }}
        >
          {h.emoji}
        </span>
      ))}
    </div>
  )
}

function RunawayButton() {
  const btnRef = useRef(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const runAway = () => {
    const btn = btnRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const margin = 20

    // Pick a random spot far enough from the current position
    let x, y, tries = 0
    do {
      x = margin + Math.random() * (window.innerWidth - rect.width - margin * 2)
      y = margin + Math.random() * (window.innerHeight - rect.height - margin * 2)
      tries++
    } while (tries < 10 && Math.hypot(x - rect.left, y - rect.top) < 200)

    setOffset((prev) => ({
      x: prev.x + (x - rect.left),
      y: prev.y + (y - rect.top),
    }))
  }

  return (
    <button
      ref={btnRef}
      className="btn btn-no"
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      onMouseEnter={runAway}
      onTouchStart={(e) => {
        e.preventDefault()
        runAway()
      }}
      onClick={runAway}
    >
      No 🤨
    </button>
  )
}

function EmojiBurst() {
  const BURST = ['💋', '💖', '😍', '💘', '✨', '💕', '😘']
  const pieces = useRef(
    Array.from({ length: 28 }, (_, i) => ({
      id: i,
      emoji: BURST[i % BURST.length],
      dx: (Math.random() - 0.5) * 2 * (window.innerWidth * 0.45),
      dy: (Math.random() - 0.5) * 2 * (window.innerHeight * 0.45),
      rot: (Math.random() - 0.5) * 540,
      size: 1.4 + Math.random() * 1.6,
      delay: Math.random() * 0.15,
    }))
  ).current

  return (
    <div className="burst" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="burst-emoji"
          style={{
            '--dx': `${p.dx}px`,
            '--dy': `${p.dy}px`,
            '--rot': `${p.rot}deg`,
            fontSize: `${p.size}rem`,
            animationDelay: `${p.delay}s`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  )
}

function CuteCat() {
  return <img className="cat" src={gatito} alt="Gatito cuqui" />
}

/* ---- Tres en raya ---- */

// Shown after each failed attempt, escalating; sticks on the last one.
const LOSS_TAUNTS = [
  'Uy yo creo que te vas a tener que esforzar más...',
  '¿Las rolitas se rinden tan fácil?',
  'No me digas que eres tan mala en tres en raya 🤨',
  'Ni siquiera tuve que abrir los ojos jajajajajajaja',
  'Ya deja de estar pensando en mí y concéntrate',
  'Una siestita y lo intentas de nuevo, tal vez mañana lo logres',
]

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

// Player is X, AI is O.
function getWinner(b) {
  for (const [a, c, d] of LINES) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { who: b[a], line: [a, c, d] }
  }
  return null
}

// Minimax with depth so the AI wins as fast / loses as slow as possible.
function minimax(b, isAi, depth) {
  const win = getWinner(b)
  if (win?.who === 'O') return { score: 10 - depth }
  if (win?.who === 'X') return { score: depth - 10 }
  if (b.every(Boolean)) return { score: 0 }

  let best = null
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue
    b[i] = isAi ? 'O' : 'X'
    const { score } = minimax(b, !isAi, depth + 1)
    b[i] = null
    if (best === null || (isAi ? score > best.score : score < best.score)) {
      best = { i, score }
    }
  }
  return best
}

// Baseline play is perfect (unbeatable). A small "blunder" chance lets her win,
// and it grows a little each time she loses so she's not stuck forever.
function aiMove(board, losses) {
  const empties = board.map((c, i) => (c ? null : i)).filter((i) => i !== null)
  const blunderChance = Math.min(0.03 + losses * 0.04, 0.28)
  if (Math.random() < blunderChance) {
    return empties[Math.floor(Math.random() * empties.length)]
  }
  return minimax(board.slice(), true, 0).i
}

function TicTacToe({ onWin }) {
  const [board, setBoard] = useState(() => Array(9).fill(null))
  const [turn, setTurn] = useState('X') // she goes first
  const [attempts, setAttempts] = useState(0)
  const [taunt, setTaunt] = useState(LOSS_TAUNTS[0])

  const result = getWinner(board)
  const isDraw = !result && board.every(Boolean)
  const over = Boolean(result) || isDraw

  // AI takes its turn shortly after hers
  useEffect(() => {
    if (turn !== 'O' || over) return
    const id = setTimeout(() => {
      const move = aiMove(board, attempts)
      setBoard((b) => {
        const next = b.slice()
        next[move] = 'O'
        return next
      })
      setTurn('X')
    }, 480)
    return () => clearTimeout(id)
  }, [turn, over, board, attempts])

  // She won -> move on to the prize
  useEffect(() => {
    if (result?.who === 'X') {
      const id = setTimeout(onWin, 900)
      return () => clearTimeout(id)
    }
  }, [result, onWin])

  const play = (i) => {
    if (board[i] || turn !== 'X' || over) return
    setBoard((b) => {
      const next = b.slice()
      next[i] = 'X'
      return next
    })
    setTurn('O')
  }

  const reset = () => {
    setBoard(Array(9).fill(null))
    setTurn('X')
    setAttempts((a) => a + 1)
  }

  // A failed attempt is any ending that isn't her win (loss or tie).
  const failed = isDraw || result?.who === 'O'

  // Pick a random taunt each time a round ends in failure (no immediate repeat).
  useEffect(() => {
    if (!failed) return
    setTaunt((prev) => {
      if (LOSS_TAUNTS.length < 2) return LOSS_TAUNTS[0]
      let next = prev
      while (next === prev) {
        next = LOSS_TAUNTS[Math.floor(Math.random() * LOSS_TAUNTS.length)]
      }
      return next
    })
  }, [failed])
  const isEmpty = board.every((c) => !c)
  let status = ''
  if (result?.who === 'X') status = '¡Me ganaste! 😳💋'
  else if (failed) status = taunt
  else if (turn === 'O') status = 'Pensando... 🤔'
  else if (isEmpty) status = 'Tú vas primero, preciosa 💅'

  const winningLine = result?.line ?? []

  return (
    <div className="ttt">
      <p className="ttt-status">{status}</p>

      <div className="board" data-locked={turn === 'O' || over ? 'true' : 'false'}>
        {board.map((cell, i) => (
          <button
            key={i}
            className={`cell${winningLine.includes(i) ? ' cell-win' : ''}`}
            onClick={() => play(i)}
            disabled={Boolean(cell) || turn !== 'X' || over}
          >
            {cell === 'X' ? '❤️' : cell === 'O' ? '🐱' : ''}
          </button>
        ))}
      </div>

      {failed && (
        <button className="btn btn-yes" onClick={reset}>
          Otra vez 🔁
        </button>
      )}
    </div>
  )
}

function App() {
  const [phase, setPhase] = useState('ask') // 'ask' | 'play' | 'win'

  return (
    <div className="app">
      <FloatingHearts />

      {phase === 'win' && (
        <main className="content pop-in">
          <EmojiBurst />
          <div className="polaroid">
            <CuteCat />
          </div>
          <h1 className="title">Ahora sí eres mi novia 😏💍</h1>
          <p className="game-sub">
            Tenemos una cita el 9 de octubre a las 20:30 🤍
          </p>
        </main>
      )}

      {phase === 'play' && (
        <main className="content">
          <h1 className="title title-game">
            ¿No creías que iba a ser tan fácil, o sí?
          </h1>
          <p className="game-sub">
            Primero tienes que ganarme en tres en raya ;)
          </p>
          <TicTacToe onWin={() => setPhase('win')} />
        </main>
      )}

      {phase === 'ask' && (
        <main className="content">
          <p className="eyebrow">hola guapa 😏</p>
          <h1 className="title">
            ¿Quieres ser
            <br />
            mi novia?
          </h1>
          <div className="buttons">
            <button className="btn btn-yes" onClick={() => setPhase('play')}>
              Sí 😍
            </button>
            <RunawayButton />
          </div>
        </main>
      )}
    </div>
  )
}

export default App
