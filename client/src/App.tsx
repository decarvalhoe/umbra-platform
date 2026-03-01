import { useEffect, useRef } from 'react'
import { Game } from 'phaser'
import { gameConfig } from './game/config'
import './App.css'

function App() {
  const gameRef = useRef<HTMLDivElement>(null)
  const phaserGameRef = useRef<Game | null>(null)

  useEffect(() => {
    if (gameRef.current && !phaserGameRef.current) {
      phaserGameRef.current = new Game({
        ...gameConfig,
        parent: gameRef.current
      })
    }

    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true)
        phaserGameRef.current = null
      }
    }
  }, [])

  return (
    <div className="App">
      <div id="game-container" ref={gameRef} />
    </div>
  )
}

export default App
