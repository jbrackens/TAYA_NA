# gstech-argocd

ArgoCD repository for managing the LuckyDino EKS clusters and applications

## File and folder structure

There are 2 types of folders in this repository: application defintions (also environment) folders (**_dev_** and **_prod_**) and kubernetes manifests folders (**_helm/*_**).

### K8s manifests

Inside this folder, you'll find the base Helm charts, suffixed with *-app* (e.g. *luckydino-app*), as well as the values files for each app (other folders, e.g. *gstech-backend*).

Any changes to the app parameters (e.g. **helm/rewardserver/prod.yaml** for production parameters of rewardserver app), as well as the base Helm charts, should be done here.

### Application definitions

In these folders we have the ArgoCD custom resource definitions (Application, ApplicationSet and AppProjects) for each environment.

Any change to the way ArgoCD and Image Updater should manage the apps, as well as notification configurations, should be done here (e.g. annotations for ArgoCD Image Updater and/or Slack notifications)

### Root folder files

The files in the root folder contain definitions for the ["app of apps" design pattern](https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/) (e.g. *dev_apps.yaml*), which acts as bootstrap for all applications defined in each application definition folder. These files **_must_** be applied manually to each k8s cluster using **kubectl** and this needs to be done only once; after that, ArgoCD will automatically pull changes from the git repository defined in each of the files.

Example:

```
# In the development cluster:
kubectl apply -f dev_apps.yaml -n argocd
```

## ArgoCD custom resource definitions

### Application

This CRD defines how an application should be deployed to the k8s cluster. It was used for stand-alone apps that were not in the same pattern as the other ones, which were templated using ApplicationSet.

This is where we define the annotations for ArgoCD Image Updater application configuration and also for Slack notification configuration.

For more information, read [the official documentation](https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/#applications).

### ApplicationSet

This CRD works as a template and uses *generators* to create several Application resources based on some parameters. For our use case, *List* generator was used, which gets values defined in a list as parameters for the template.

For more information, read [the official documentation](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/).

### AppProject

This CRD defines a container for the applications in the ArgoCD context. We can use the projects to reduce the privilege its applications have over the k8s cluster, as well as to give other teams (e.g. development) granular permissions over ArgoCD resources and UI.

For more information, read [the official documentation](https://argo-cd.readthedocs.io/en/stable/user-guide/projects/).

## Other ArgoCD configurations

ArgoCD (and Image Updater) configuration, such as RBAC policies, repository credential templates and ECR credentials are out of scope of this repository. Those can be found in the [infrastructure as code for LuckyDino repository](https://github.com/flipadmin/luckydino-infrastructure).