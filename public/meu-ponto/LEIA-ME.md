# Meu Ponto — web/PWA (versão inicial)

Página privada e instalável no Android: `/meu-ponto/`.

- Fonte em `public/meu-ponto/`; publicação estática espelhada em `docs/meu-ponto/`, usada pelo GitHub Pages.
- Não altera a página principal nem o projeto de código do Geladinho dos Sonhos.
- Backend: tabela `public.mp_workdays` do projeto Supabase existente, **com RLS por usuário autenticado**; não usa nenhuma tabela de vendas. Em produção, pode ser migrado para projeto Supabase isolado.
- Credencial no frontend: **somente chave publishable**; não existe service-role nem credencial privada no repositório.
- Login por e-mail/senha Supabase Auth. Confirmação por e-mail pode ser exigida.
- A tela guarda dados na nuvem e mantém cache local quando offline; sincroniza quando recuperar conexão. Em caso de conflito entre dispositivos, não substitui automaticamente a versão remota.
- A primeira importação é **manual, uma única vez**, usando o arquivo TXT exportado da versão antiga. Não colocar backups pessoais ou horários reais no código do site, pois o repositório é público.
- Identifica marcação isolada na madrugada e pergunta ao usuário se pertence à jornada anterior antes de vincular.
- Mantém em branco as batidas não registradas e sinaliza jornadas parciais; não inventa saída.
- O sábado tem horário previsto próprio. Extras após 16:00 (1º turno seg–sex) ou 23:04 (2º turno seg–sex) são estimativas, sem tolerância legal ou adicional noturno monetizado.
- A PWA não é um APK. Atualizações do site não exigem reinstalação, mas ainda precisam de publicação/implantação.
- O cache no navegador não é backup permanente: para segurança, aguardar **Salvo na nuvem** após cada sincronização.
- **Não desinstale o Meu Ponto Android antigo antes de importar o backup e comparar todos os registros.**

## Testes mínimos antes da migração

1. Criar/login na conta com confirmação de e-mail, quando exigida.
2. Importar o backup de texto e conferir cada jornada, inclusive os registros que atravessaram a meia-noite.
3. Conferir os dias do primeiro e segundo turnos, principalmente aqueles que atravessaram a meia-noite.
4. Conferir os horários vazios e preencher pelo papel de horas extras.
5. Verificar **Salvo na nuvem**, sair, entrar em outro aparelho e conferir se os registros aparecem.
6. Testar registro offline e sincronização ao voltar a internet.
7. Validar manualmente divergências de cálculo com o espelho oficial da empresa.

## Fonte estática

`public/meu-ponto` e `docs/meu-ponto` devem ser mantidas sincronizadas quando a página for alterada.
