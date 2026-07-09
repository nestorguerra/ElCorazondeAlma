# El Corazón de Alma

Simulador educativo de cardiología para explorar un corazón tridimensional, modificar constantes fisiológicas y observar cómo diez escenarios cardiovasculares cambian el movimiento, la hemodinámica y un ECG sintético en tiempo real.

## Incluye

- Corazón 3D procedimental con rotación de 360°, zoom, animación mecánica y zonas afectadas resaltadas.
- Frecuencia cardíaca, temperatura, presión arterial, SpO₂, LDL y viscosidad relativa conceptual.
- Diez escenarios: fibrilación auricular, taquicardia ventricular, bloqueo AV, isquemia, infarto STEMI, insuficiencia cardíaca, estenosis aórtica, insuficiencia mitral, pericarditis y miocardiopatía hipertrófica.
- ECG sintético con derivaciones didácticas DII, V2 y V5.
- Severidad, variable específica y velocidad de evolución clínica independientes del ritmo del latido.
- Explicaciones sobre qué mirar, cómo se relacionan las variables y qué límites tiene cada representación.

## Uso local

Requiere Node.js 22.13 o posterior.

```bash
npm install
npm run dev
```

Para validar la aplicación:

```bash
npm test
```

## Aviso

Es una herramienta docente simplificada. No genera trazados diagnósticos, no representa a un paciente real y no debe utilizarse para tomar decisiones clínicas.
