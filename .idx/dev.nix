{ pkgs, ... }: {
  # Firebase Studio / Project IDX development environment for URAI staging.
  # Firestore emulator requires Java; do not use sudo/apt-get inside this Nix workspace.
  packages = [
    pkgs.nodejs_20
    pkgs.openjdk17
    pkgs.git
  ];

  idx = {
    extensions = [
      "dbaeumer.vscode-eslint"
      "esbenp.prettier-vscode"
    ];
  };
}
