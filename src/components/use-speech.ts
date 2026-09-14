'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** Web Speech API はブラウザ実装で型が未提供のため、使う範囲だけ宣言する */
type SpeechRecognitionAlternativeLike = { transcript: string }
type SpeechRecognitionResultLike = {
  isFinal: boolean
  length: number
  [index: number]: SpeechRecognitionAlternativeLike
}
type SpeechRecognitionEventLike = {
  resultIndex: number
  results: { length: number; [index: number]: SpeechRecognitionResultLike }
}
type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const ERROR_MESSAGE: Record<string, string> = {
  'not-allowed': 'マイクの使用が許可されていません。ブラウザの設定で許可してください。',
  'service-not-allowed': 'マイクの使用が許可されていません。ブラウザの設定で許可してください。',
  'no-speech': '音声が聞き取れませんでした。もう一度お試しください。',
  'audio-capture': 'マイクが見つかりません。端末の設定を確認してください。',
  network: 'ネットワークに接続できず、音声認識を利用できませんでした。',
}

export function useSpeech(onFinal: (text: string) => void) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognition = useRef<SpeechRecognitionLike | null>(null)
  const finalHandler = useRef(onFinal)
  finalHandler.current = onFinal

  useEffect(() => {
    setSupported(getCtor() !== null)
    return () => recognition.current?.abort()
  }, [])

  const stop = useCallback(() => {
    recognition.current?.stop()
    setListening(false)
    setInterim('')
  }, [])

  const start = useCallback(() => {
    const Ctor = getCtor()
    if (!Ctor) {
      setError('このブラウザは音声入力に対応していません。Chrome または Edge をお使いください。')
      return
    }
    setError(null)
    const rec = new Ctor()
    rec.lang = 'ja-JP'
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (event) => {
      let pending = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const text = result[0]?.transcript ?? ''
        if (result.isFinal) finalHandler.current(text)
        else pending += text
      }
      setInterim(pending)
    }
    rec.onerror = (e) => {
      setError(ERROR_MESSAGE[e.error] ?? `音声入力でエラーが発生しました（${e.error}）。`)
      setListening(false)
    }
    rec.onend = () => {
      setListening(false)
      setInterim('')
    }

    recognition.current = rec
    rec.start()
    setListening(true)
  }, [])

  return { supported, listening, interim, error, start, stop }
}
