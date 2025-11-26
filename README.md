# OPV Dataset: Organic Photovoltaic Donor-Acceptor Dataset (OPV2D)

## Overview

This repository hosts **OPV2D**, a continuously updated dataset for organic photovoltaic (OPV) donor–acceptor (D/A) materials. The dataset integrates previously published OPV datasets and expands them through ongoing manual verification and new data collection. It is designed to support machine learning research, molecular generation, and large-scale OPV screening.

The dataset is stored in a single real-time database:

* **Active_Database.csv** — Contains all collected data.
  Each entry is annotated with a `checked` field indicating whether it has been manually validated.

This design allows the dataset to grow organically while maintaining transparent data quality tracking.

---

## Usage

This dataset is ideal for:

* **Machine Learning**: Training predictive models to estimate OPV performance (e.g., PCE, HOMO-LUMO levels) and classify OPV-active materials.
* **Generative Design**: Using the dataset with generative models to create new OPV materials with optimized properties.
* **Materials Discovery**: Accelerating the discovery of new donor-acceptor pairs for OPVs by leveraging both the active and verified databases.

---

## Citation

If you use this dataset in your research, please cite the following paper:
```bibtex
@misc{qiu2025,
      title={Accelerating High-Efficiency Organic Photovoltaic Discovery via Pretrained Graph Neural Networks and Generative Reinforcement Learning}, 
      author={Jiangjie Qiu and Hou Hei Lam and Xiuyuan Hu and Wentao Li and Siwei Fu and Fankun Zeng and Hao Zhang and Xiaonan Wang},
      year={2025},
      eprint={2503.23766},
      archivePrefix={arXiv},
      primaryClass={cs.LG},
      url={https://arxiv.org/abs/2503.23766}, 
}

@misc{lam2025cyclechemistdualprongedmachinelearning,
      title={CycleChemist: A Dual-Pronged Machine Learning Framework for Organic Photovoltaic Discovery}, 
      author={Hou Hei Lam and Jiangjie Qiu and Xiuyuan Hu and Wentao Li and Fankun Zeng and Siwei Fu and Hao Zhang and Xiaonan Wang},
      year={2025},
      eprint={2511.19500},
      archivePrefix={arXiv},
      primaryClass={cond-mat.mtrl-sci},
      url={https://arxiv.org/abs/2511.19500}, 
}
```
And cite the original data sources:

```bibtex
@article{Min2020,
   author  = {Wu, Yao and Guo, Jie and Sun, Rui and Min, Jie},
   title   = {Machine learning for accelerating the discovery of high-performance donor/acceptor pairs in non-fullerene organic solar cells},
   journal = {npj Computational Materials},
   volume  = {6},
   number  = {1},
   pages   = {120},
   year    = {2020}
}

@article{Saeki2021,
   author  = {Miyake, Yuta and Saeki, Akinori},
   title   = {Machine Learning-Assisted Development of Organic Solar Cell Materials: Issues, Analyses, and Outlooks},
   journal = {The Journal of Physical Chemistry Letters},
   volume  = {12},
   number  = {51},
   pages   = {12391-12401},
   year    = {2021}
}
```

---

## License

This dataset is made publicly available for academic and research purposes. It is distributed under the terms of the MIT License, allowing free usage for research activities.

## Contact

For any further inquiries or to collaborate, please contact Me at whilesunny@gmail.com
