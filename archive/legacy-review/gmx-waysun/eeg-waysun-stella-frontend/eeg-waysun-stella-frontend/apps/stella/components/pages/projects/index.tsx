import React from "react";
import SectionComponent from "./../../shared/sectionComponent";
import ProjectList from "./list";
import ProjectForm from "./form";
import { defaultNamespaces } from "../defaults";
import Router from "next/router";

const Projects = () => {
  const currentProjectId: string | string[] | undefined = Router.query?.id;
  const addMode = Router.pathname.includes("add");

  return (
    <SectionComponent
      left={<ProjectList projectId={currentProjectId} />}
      right={
        (currentProjectId || addMode) && (
          <ProjectForm addMode={addMode} projectId={currentProjectId} />
        )
      }
    />
  );
};

Projects.namespacesRequired = [...defaultNamespaces];

export default Projects;
