class Idfx < Formula
  desc "Idefix CLI tool"
  homepage "https://github.com/flipadmin/idfx-cli"
  url "file://#{__dir__}/idfx-v0.8.10.tar.gz"
  version "0.8.10"

  sha256 "af0c680b758c7ec1767133098c80ea116cbeccde57e063edba0328cc8f37ce4d"

  depends_on "axllent/apps/mailpit"
  depends_on "ankitpokhrel/jira-cli/jira-cli"
  depends_on "bash"
  depends_on "flock"
  depends_on "fnm"
  depends_on "gh"
  depends_on "git-lfs"
  depends_on "gojq"
  depends_on "gnu-sed"
  depends_on "gum"
  depends_on "jless"
  depends_on "jq"
  depends_on "kubectx"
  depends_on "lnav"
  depends_on "logcli"
  depends_on "mprocs"
  depends_on "msoap/tools/shell2http"
  depends_on "postgresql@14"
  depends_on "rsync"
  depends_on "stern"
  depends_on "yq"

  def install
    prefix.install Dir["*"]
    zsh_completion.install "#{prefix}/completion/_idfx"
  end

  test do
    system "#{bin}/idfx", "-v"
  end
end
