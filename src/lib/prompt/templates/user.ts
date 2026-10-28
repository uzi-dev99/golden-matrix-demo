export const USER_TEMPLATE = `Redacta la lectura de la carta natal.

Nombre (dato del cliente):
{{name}}

Nacimiento: {{birth_date}}, {{birth_time}} ({{timezone}})
Lugar:
{{place}}
Coordenadas: {{coordinates}}
Instante UTC: {{utc_instant}}

Ángulos
{{angles}}

Planetas (signo, grado, casa)
{{planets}}

Casas (cúspides)
{{houses}}

Aspectos
{{aspects}}

Nodos lunares
{{nodes}}

Avisos del cálculo
{{warnings}}`;
