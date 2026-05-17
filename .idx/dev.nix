{ pkgs, ... }: {
  # Firebase Studio / Project IDX development environment for URAI staging.
  # Firestore emulator requires Java; do not use sudo/apt-get inside this Nix workspace.
  # Firebase Studio's package picker exposes adoptopenjdk-bin, so use that package
  # instead of openjdk17 for better compatibility with this workspace image.
  packages = [
    pkgs.nodejs_20
    pkgs.adoptopenjdk-bin
    pkgs.git
  ];

  idx = {
    extensions = [
      "dbaeumer.vscode-eslint"
      "esbenp.prettier-vscode"
    ];
  };
}
