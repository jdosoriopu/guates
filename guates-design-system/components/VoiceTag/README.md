# VoiceTag

A tilted brush-lettered pill for one or two words of brand voice: personality traits, customer attributes, sticker-like asides.

**Props.** `tone` (palette token, default `naranja-tostion`), `ink` (defaults to the voice-trait pairing in `Guates.voice`, else `inkFor(tone)`), `tilt` in degrees (default −2; vary between −3 and 3 across a cluster), `size` (`sm` 20px, `md` 24px default, `lg` 40px), children (the words).

**Use** for the six voice traits (Conversacional, Claro, Curioso, Generoso, Honesto, Vivo; `Guates.voice`), customer manifesto attributes ("Busca café con criterio"), and short callouts scattered over photography. Keep each tag to a few words in sentence case.

**Contrast and size.** Caveat Brush has one regular weight, so `md` (24px) and `lg` (40px) count as large text and need 3:1, while `sm` (20px) needs 4.5:1. *Conversacional* (crema on naranja tostión, 3.8:1), *Honesto* (crema on azul exploración, 3.8:1) and *Curioso* (verde moriche on verde brote, 4.0:1) meet 3:1 but not 4.5:1, so they render at `md` even when `sm` is requested; the same applies to any `tone` and `ink` below 4.5:1. *Claro*, *Generoso* and *Vivo* work at every size. The brandbook shows *Curioso* in crema on verde brote, which measures 2.2:1 and fails at any size, so the system pairs it with verde moriche; don't pass `ink="crema-de-papel"` on verde brote.

**Don't** use a VoiceTag as a button or status badge, put sentences in it, or stack more than eight in one view.
