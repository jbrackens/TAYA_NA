import argparse
import yaml
import subprocess
import tempfile
import git


def create_docs_map(filepath):
    docs_map = {}

    with open(filepath, "r") as f:
        data = f.read()
        docs = yaml.safe_load_all(data)

        for doc in docs:
            if not doc:
                continue

            # Remove extra labels that are added by ArgoCD.
            if "labels" in doc["metadata"]:
                doc["metadata"]["labels"].pop("argocd.argoproj.io/instance", None)

                if not doc["metadata"]["labels"]:
                    doc["metadata"].pop("labels", None)

            kind = doc["kind"]
            name = doc["metadata"]["name"]
            docs_map[f"{kind.lower()}-{name}"] = doc

    return docs_map


def clean_up_manifests(docs):
    to_delete = []

    for k, doc in docs.items():
        if "annotations" in doc["metadata"]:
            annotations = list(doc["metadata"]["annotations"].keys())

            if any(["hook" in annotation for annotation in annotations]):
                print(f"Skipping helm hook {k}")
                to_delete.append(k)
                continue

        # Update the image tag so it doesn't produce a diff.
        if k.startswith("deployment"):
            image = docs[k]["spec"]["template"]["spec"]["containers"][0]["image"]
            docs[k]["spec"]["template"]["spec"]["containers"][0][
                "image"
            ] = f"{image.split(':')[0]}:latest"

    for entry in to_delete:
        del docs[entry]

    return docs


def save_docs(docs, repo_dir):
    for k, doc in docs.items():
        filename = f"{k}.yaml"
        with open(repo_dir + "/" + filename, "w", encoding="utf8") as fp:
            fp.write(yaml.dump(doc))


def calc_diff(live_docs, local_docs):
    live_docs = clean_up_manifests(live_docs)
    local_docs = clean_up_manifests(local_docs)

    repo_dir = tempfile.mkdtemp()
    repo = git.Repo.init(repo_dir)

    save_docs(live_docs, repo_dir)
    repo.git.add(all=True)
    repo.index.commit("Init")

    p = subprocess.Popen(
        f"cd {repo_dir} && rm -rf *.yaml",
        stdout=subprocess.PIPE,
        shell=True,
    )
    print(p.communicate()[0].decode("utf-8"))

    save_docs(local_docs, repo_dir)
    repo.git.add(all=True)
    repo.index.commit("Add local changes")

    p = subprocess.Popen(
        f"cd {repo_dir} && git diff -u HEAD~1 | diff-so-fancy",
        stdout=subprocess.PIPE,
        shell=True,
    )
    print(p.communicate()[0].decode("utf-8"))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Convert two yaml files to dict and compare equality. Allows comparison of differently ordered keys."
    )
    parser.add_argument("file_paths", type=str, nargs=2, help="Paths to YAML docs")
    args = parser.parse_args()

    calc_diff(create_docs_map(args.file_paths[0]), create_docs_map(args.file_paths[1]))
